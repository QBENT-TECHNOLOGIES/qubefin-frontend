import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, effect, inject, signal, untracked } from '@angular/core';
import type { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { AuthStore, ENV_CONFIG } from 'qubefin-core';
import { Subject } from 'rxjs';

/**
 * Off = not used right now (no screen watching, signed out, or no `liveSocketUrl`).
 * Denied = the server refused the team's topics (`SUBSCRIBE rejected`); retried every few minutes, polling continues.
 */
export type LiveSocketState = 'Off' | 'Connecting' | 'Live' | 'Reconnecting' | 'Denied';

export type LiveTopic = 'gps' | 'alarms';

/** One message pushed on `/topic/employee/{employeeId}/{topic}`. */
export interface LiveSocketMessage {
  employeeId: string;
  topic: LiveTopic;
  /** Parsed JSON body (the raw text when it is not JSON). Read it with `utils/live-message.ts`. */
  body: unknown;
  /** When the browser received it (ISO). */
  receivedAt: string;
}

const RECONNECT_MS = 5_000;
/** Reconnect delay doubles after each failed attempt up to this (server down / unreachable). */
const MAX_RECONNECT_MS = 60_000;
/**
 * After the server refuses a subscription it closes the whole connection, so reconnecting at once would only repeat it
 * (seen 18 Nov 2026: connect → 78 SUBSCRIBEs → ERROR "SUBSCRIBE rejected: topic belongs to another employee" → close, every 5 s).
 * Wait this long before trying again, so a fixed backend is picked up without a page reload.
 */
const DENIED_RETRY_MS = 5 * 60_000;
/** Keep the connection this long after the last screen stops watching, so moving between tracking screens does not reconnect. */
const IDLE_CLOSE_MS = 15_000;

/**
 * Live GPS fixes and alarms from the tracking backend: STOMP over SockJS at `environment.liveSocketUrl`
 * (dev: `http://3.111.193.85:8080/ws/live`), the access token in `?token=`.
 *
 * Topics, one pair per employee: `/topic/employee/{employeeId}/gps` and `/topic/employee/{employeeId}/alarms`.
 * Screens call `watchEmployees()` with the people they show (the caller's `field-officers` list); the service keeps one
 * connection for all of them, subscribes / unsubscribes as the list changes, re-subscribes after a reconnect and closes when
 * no screen is watching. Browser only (nothing runs during server-side rendering). Polling stays on as the backup.
 */
@Injectable({ providedIn: 'root' })
export class LiveSocketService {
  private readonly auth = inject(AuthStore);
  private readonly url: string = isPlatformBrowser(inject(PLATFORM_ID))
    ? (inject(ENV_CONFIG, { optional: true })?.liveSocketUrl ?? '')
    : '';

  /** False when no `liveSocketUrl` is configured (or on the server): screens fall back to polling only. */
  readonly enabled = !!this.url;
  readonly state = signal<LiveSocketState>('Off');
  /** When the last message arrived (ISO), for the "Live" badge. */
  readonly lastMessageAt = signal<string | null>(null);

  readonly gps$ = new Subject<LiveSocketMessage>();
  readonly alarms$ = new Subject<LiveSocketMessage>();

  private client: Client | null = null;
  private starting: Promise<void> | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private deniedTimer: ReturnType<typeof setTimeout> | null = null;
  private connectedToken: string | null = null;
  /** One entry per watching screen. */
  private readonly leases = new Map<symbol, ReadonlySet<string>>();
  /** employeeId → its gps + alarms subscriptions on the current connection. */
  private readonly subscribed = new Map<string, StompSubscription[]>();
  private readonly loggedFirst = new Set<LiveTopic>();
  private errorLogged = false;

  constructor() {
    // Signed out: close. Signed in again (new token): reconnect so the server checks the new token.
    effect(() => {
      const token = this.auth.accessToken();
      untracked(() => {
        if (!token) this.stop();
        else if (!this.client) {
          this.clearDenied(); // a new sign-in may be allowed what the last one was not
          this.sync();
        }
        else if (this.connectedToken && token !== this.connectedToken) this.client.forceDisconnect();
      });
    });
  }

  /**
   * Receive live messages for these employees while the calling screen is open. Call in an injection context
   * (component constructor); the watch ends when that component is destroyed.
   */
  watchEmployees(ids: () => readonly string[]): void {
    if (!this.enabled) return;
    const key = Symbol('live-watch');
    const ref = effect(() => {
      const wanted = new Set(ids().filter(Boolean));
      untracked(() => {
        this.leases.set(key, wanted);
        this.sync();
      });
    });
    inject(DestroyRef).onDestroy(() => {
      ref.destroy();
      this.leases.delete(key);
      this.sync();
    });
  }

  private wanted(): Set<string> {
    const all = new Set<string>();
    this.leases.forEach((ids) => ids.forEach((id) => all.add(id)));
    return all;
  }

  /** Brings the connection and the subscriptions in line with what the screens want. */
  private sync(): void {
    const wanted = this.wanted();
    if (!wanted.size || !this.auth.accessToken()) {
      if (this.client && !this.idleTimer) this.idleTimer = setTimeout(() => this.stop(), IDLE_CLOSE_MS);
      return;
    }
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.deniedTimer) return; // refused by the server: wait for the retry
    if (!this.client) {
      void this.start();
      return;
    }
    if (!this.client.connected) return; // onConnect calls sync() again.

    for (const [id, subs] of this.subscribed) {
      if (wanted.has(id)) continue;
      subs.forEach((s) => s.unsubscribe());
      this.subscribed.delete(id);
    }
    for (const id of wanted) {
      if (!this.subscribed.has(id)) this.subscribed.set(id, [this.subscribe(id, 'gps'), this.subscribe(id, 'alarms')]);
    }
  }

  private start(): Promise<void> {
    this.starting ??= this.open()
      .catch((e) => {
        console.warn('[live] Could not start the live connection; polling continues.', e);
        this.state.set('Off');
      })
      .finally(() => (this.starting = null));
    return this.starting;
  }

  private async open(): Promise<void> {
    this.state.set('Connecting');
    // Loaded on first use, so the libraries are not in the main bundle.
    const [{ Client, ReconnectionTimeMode }, sockjs] = await Promise.all([
      import('@stomp/stompjs'),
      import('sockjs-client/dist/sockjs.min.js'),
    ]);
    const SockJS = sockjs.default;
    if (this.client || !this.wanted().size || !this.auth.accessToken()) {
      if (!this.client) this.state.set('Off');
      return;
    }

    const client: Client = new Client({
      webSocketFactory: () => {
        this.connectedToken = this.auth.accessToken();
        return new SockJS(`${this.url}?token=${encodeURIComponent(this.connectedToken ?? '')}`);
      },
      reconnectDelay: RECONNECT_MS,
      reconnectTimeMode: ReconnectionTimeMode.EXPONENTIAL,
      maxReconnectDelay: MAX_RECONNECT_MS,
      heartbeatIncoming: 10_000,
      heartbeatOutgoing: 10_000,
      beforeConnect: async () => {
        // Expired or signed out: stop instead of retrying with a dead token.
        if (this.auth.isAuthenticated()) return;
        if (this.client === client) this.stop();
        else await client.deactivate();
      },
      onConnect: () => {
        this.errorLogged = false;
        this.state.set('Live');
        this.subscribed.clear(); // subscriptions of an earlier connection are gone
        this.sync();
      },
      onWebSocketClose: () => {
        this.subscribed.clear();
        if (this.client === client) this.state.set('Reconnecting');
      },
      onWebSocketError: () => {
        if (!this.errorLogged) console.warn(`[live] Cannot reach ${this.url}; retrying every ${RECONNECT_MS / 1000} s.`);
        this.errorLogged = true;
      },
      onStompError: (frame) => {
        const message = frame.headers['message'] ?? '';
        if (/subscribe rejected/i.test(message)) return this.deny(client, message);
        console.warn('[live] STOMP error:', message, frame.body);
      },
      debug: () => undefined,
    });
    this.client = client;
    client.activate();
  }

  private subscribe(employeeId: string, topic: LiveTopic): StompSubscription {
    return this.client!.subscribe(`/topic/employee/${employeeId}/${topic}`, (msg) => this.receive(employeeId, topic, msg));
  }

  private receive(employeeId: string, topic: LiveTopic, msg: IMessage): void {
    let body: unknown = msg.body;
    try {
      body = JSON.parse(msg.body);
    } catch {
      // not JSON: pass the text on
    }
    // The message shapes are not agreed yet: show the first of each kind so it can be checked against the mapping.
    if (!this.loggedFirst.has(topic)) {
      this.loggedFirst.add(topic);
      console.info(`[live] First ${topic} message (employee ${employeeId}):`, body);
    }
    const receivedAt = new Date().toISOString();
    this.lastMessageAt.set(receivedAt);
    (topic === 'gps' ? this.gps$ : this.alarms$).next({ employeeId, topic, body, receivedAt });
  }

  /** The server refused our topics and dropped the connection: stop, and try again in a few minutes. */
  private deny(client: Client, message: string): void {
    if (this.client !== client) return;
    console.warn(
      `[live] The live server refused the team's topics ("${message}"). Live updates are off; retrying in ${DENIED_RETRY_MS / 60_000} min. ` +
        'The server must let a manager subscribe to /topic/employee/{id}/… for the people they may monitor.',
    );
    this.stop();
    this.state.set('Denied');
    this.deniedTimer = setTimeout(() => {
      this.deniedTimer = null;
      this.state.set('Off');
      this.sync();
    }, DENIED_RETRY_MS);
  }

  private clearDenied(): void {
    if (!this.deniedTimer) return;
    clearTimeout(this.deniedTimer);
    this.deniedTimer = null;
    this.state.set('Off');
  }

  private stop(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = null;
    const client = this.client;
    this.client = null;
    this.subscribed.clear();
    this.connectedToken = null;
    this.state.set('Off');
    void client?.deactivate();
  }
}
