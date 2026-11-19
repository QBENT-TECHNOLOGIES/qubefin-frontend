import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, Signal, WritableSignal, effect, inject, signal, untracked } from '@angular/core';
import type { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { AuthStore, ENV_CONFIG } from 'qubefin-core';
import { Subject } from 'rxjs';
import { TrackingViewerStore } from '../stores/tracking-viewer-store';

/**
 * Off = not used right now (no screen watching, signed out, no `liveSocketUrl`, or no `EmployeeId` in the token).
 * Denied = the server refused a subscription (`SUBSCRIBE rejected`); retried every few minutes, polling continues.
 */
export type LiveSocketState = 'Off' | 'Connecting' | 'Live' | 'Reconnecting' | 'Denied';

/** Destinations under `/topic/employee/{employeeId}/`. */
export type LiveTopic = 'gps' | 'motion' | 'active-users';

/** One message pushed on `/topic/employee/{employeeId}/{topic}`. */
export interface LiveSocketMessage {
  /** Owner of the topic it arrived on. A message may name someone else in its body; the readers take the body's id first. */
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
/** After the server refuses a subscription (it then closes the connection), wait this long before trying the same again. */
const DENIED_RETRY_MS = 5 * 60_000;
/** Keep a connection this long after the last screen stops watching, so moving between tracking screens does not reconnect. */
const IDLE_CLOSE_MS = 15_000;

interface Destination {
  employeeId: string;
  topic: LiveTopic;
}

/**
 * Live updates from the tracking backend: STOMP over SockJS at `environment.liveSocketUrl`
 * (dev: `http://3.111.193.85:8080/ws/live`), the access token in `?token=`. Two connections:
 *
 * - **Team** (`watchTeam()`): `/topic/employee/{me}/active-users`, the roster of the active people under the signed-in user, where
 *   `me` is the `employeeId` from `app-api/users/login-info` (the token's `EmployeeId` until that has loaded; they are the same). Live Tracking takes the list's status badges and the KPI counts from it.
 * - **Person** (`follow()`): `/topic/employee/{selected}/gps` and `/motion` of the person clicked on Live Tracking.
 *
 * They are separate because the server answers a subscription it refuses by closing the whole connection (seen 18–19 Nov 2026:
 * `SUBSCRIBE rejected: topic belongs to another employee` for another employee's topics): a refused person must not stop the
 * team roster. Each connection re-subscribes after a reconnect and closes when no screen needs it. Browser only. Polling and
 * the REST calls stay on as the backup.
 */
@Injectable({ providedIn: 'root' })
export class LiveSocketService {
  private readonly auth = inject(AuthStore);
  private readonly viewer = inject(TrackingViewerStore).viewer;
  private readonly url: string = isPlatformBrowser(inject(PLATFORM_ID))
    ? (inject(ENV_CONFIG, { optional: true })?.liveSocketUrl ?? '')
    : '';

  /** False when no `liveSocketUrl` is configured (or on the server): screens fall back to polling only. */
  readonly enabled = !!this.url;
  /** When the last message arrived on either connection (ISO), for the "Live" badge. */
  readonly lastMessageAt = signal<string | null>(null);

  readonly gps$ = new Subject<LiveSocketMessage>();
  readonly motion$ = new Subject<LiveSocketMessage>();
  readonly activeUsers$ = new Subject<LiveSocketMessage>();

  private readonly teamLeases = new Set<symbol>();
  private readonly personLeases = new Map<symbol, () => string | null>();

  private readonly team = new StompChannel('team', this.url, this.auth, () => this.teamDestinations(), (d, m) => this.receive(d, m));
  private readonly person = new StompChannel('person', this.url, this.auth, () => this.personDestinations(), (d, m) => this.receive(d, m));

  /** State of the team connection (`active-users`). */
  readonly state: Signal<LiveSocketState> = this.team.state;
  /** State of the selected person's connection (`gps`, `motion`). */
  readonly personState: Signal<LiveSocketState> = this.person.state;
  /** The person whose topics are followed now. */
  readonly followedId = signal<string | null>(null);

  constructor() {
    // Signed out: close. Signed in again (new token): reconnect so the server checks the new token.
    effect(() => {
      const token = this.auth.accessToken();
      untracked(() => {
        this.team.tokenChanged(token);
        this.person.tokenChanged(token);
      });
    });
    // login-info loaded (or another user): subscribe to that employee's roster.
    effect(() => {
      this.viewer()?.employeeId;
      untracked(() => this.team.sync());
    });
  }

  /** The active-users roster while the calling screen is open. Call in an injection context (component constructor). */
  watchTeam(): void {
    if (!this.enabled) return;
    const key = Symbol('team');
    this.teamLeases.add(key);
    this.team.sync();
    inject(DestroyRef).onDestroy(() => {
      this.teamLeases.delete(key);
      this.team.sync();
    });
  }

  /** Live GPS and motion of the person `id()` returns (null = nobody) while the calling screen is open. */
  follow(id: () => string | null): void {
    if (!this.enabled) return;
    const key = Symbol('person');
    const ref = effect(() => {
      const wanted = id();
      untracked(() => {
        this.personLeases.set(key, () => wanted);
        this.syncPerson();
      });
    });
    inject(DestroyRef).onDestroy(() => {
      ref.destroy();
      this.personLeases.delete(key);
      this.syncPerson();
    });
  }

  private syncPerson(): void {
    const ids = [...this.personLeases.values()].map((f) => f()).filter((x): x is string => !!x);
    this.followedId.set(ids[0] ?? null);
    this.person.sync();
  }

  private teamDestinations(): Destination[] {
    const me = this.viewer()?.employeeId ?? employeeIdOf(this.auth.accessToken());
    return this.teamLeases.size && me ? [{ employeeId: me, topic: 'active-users' }] : [];
  }

  private personDestinations(): Destination[] {
    const id = this.followedId();
    return id ? [{ employeeId: id, topic: 'gps' }, { employeeId: id, topic: 'motion' }] : [];
  }

  private receive(d: Destination, msg: IMessage): void {
    let body: unknown = msg.body;
    try {
      body = JSON.parse(msg.body);
    } catch {
      // not JSON: pass the text on
    }
    const receivedAt = new Date().toISOString();
    this.lastMessageAt.set(receivedAt);
    const message: LiveSocketMessage = { employeeId: d.employeeId, topic: d.topic, body, receivedAt };
    if (d.topic === 'gps') this.gps$.next(message);
    else if (d.topic === 'motion') this.motion$.next(message);
    else this.activeUsers$.next(message);
  }
}

/** One STOMP connection that keeps its subscriptions equal to `destinations()`. */
class StompChannel {
  readonly state: WritableSignal<LiveSocketState> = signal('Off');

  private client: Client | null = null;
  private starting: Promise<void> | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  /** Refused set of destinations and when to try it again; another set is tried at once. */
  private denied: { key: string; until: number } | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private connectedToken: string | null = null;
  private readonly subscribed = new Map<string, StompSubscription>();
  private readonly loggedFirst = new Set<LiveTopic>();
  private errorLogged = false;

  constructor(
    private readonly name: string,
    private readonly url: string,
    private readonly auth: AuthStore,
    private readonly destinations: () => Destination[],
    private readonly onMessage: (d: Destination, msg: IMessage) => void,
  ) {}

  tokenChanged(token: string | null): void {
    if (!token) return this.stop();
    if (!this.client) {
      this.denied = null; // a new sign-in may be allowed what the last one was not
      this.sync();
    } else if (this.connectedToken && token !== this.connectedToken) this.client.forceDisconnect();
  }

  /** Brings the connection and the subscriptions in line with `destinations()`. */
  sync(): void {
    const wanted = this.destinations();
    if (!wanted.length || !this.auth.accessToken()) {
      if (this.client && !this.idleTimer) this.idleTimer = setTimeout(() => this.stop(), IDLE_CLOSE_MS);
      if (!this.client) this.state.set('Off');
      return;
    }
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    const key = keyOf(wanted);
    if (this.denied) {
      if (this.denied.key === key && Date.now() < this.denied.until) return this.state.set('Denied');
      this.denied = null;
    }
    if (!this.client) {
      void this.start();
      return;
    }
    if (!this.client.connected) return; // onConnect calls sync() again.

    const wantedPaths = new Map(wanted.map((d) => [pathOf(d), d]));
    for (const [path, sub] of this.subscribed) {
      if (wantedPaths.has(path)) continue;
      sub.unsubscribe();
      this.subscribed.delete(path);
    }
    for (const [path, d] of wantedPaths) {
      if (!this.subscribed.has(path)) this.subscribed.set(path, this.client.subscribe(path, (msg) => this.receive(d, msg)));
    }
  }

  private receive(d: Destination, msg: IMessage): void {
    // The message shapes are not agreed yet: show the first of each kind so it can be checked against the mapping.
    if (!this.loggedFirst.has(d.topic)) {
      this.loggedFirst.add(d.topic);
      console.info(`[live] First ${d.topic} message (${d.employeeId}):`, msg.body);
    }
    this.onMessage(d, msg);
  }

  private start(): Promise<void> {
    this.starting ??= this.open()
      .catch((e) => {
        console.warn(`[live] Could not start the ${this.name} connection; polling continues.`, e);
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
    if (this.client || !this.destinations().length || !this.auth.accessToken()) {
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

  /** The server refused a subscription and dropped the connection: stop; try the same again in a few minutes. */
  private deny(client: Client, message: string): void {
    if (this.client !== client) return;
    const wanted = this.destinations();
    console.warn(
      `[live] The live server refused ${wanted.map(pathOf).join(', ')} ("${message}"). Retrying in ${DENIED_RETRY_MS / 60_000} min.`,
    );
    this.stop();
    this.denied = { key: keyOf(wanted), until: Date.now() + DENIED_RETRY_MS };
    this.state.set('Denied');
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => this.sync(), DENIED_RETRY_MS + 100);
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

const pathOf = (d: Destination) => `/topic/employee/${d.employeeId}/${d.topic}`;
const keyOf = (ds: Destination[]) => ds.map(pathOf).sort().join('|');

/** `EmployeeId` claim of a JWT (base64url payload), or null. */
function employeeIdOf(token: string | null): string | null {
  const payload = token?.split('.')[1];
  if (!payload) return null;
  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '='));
    const claims = JSON.parse(json) as Record<string, unknown>;
    const key = Object.keys(claims).find((k) => k.toLowerCase() === 'employeeid');
    const id = key ? claims[key] : null;
    return typeof id === 'string' && id.trim() ? id.trim() : null;
  } catch {
    return null;
  }
}
