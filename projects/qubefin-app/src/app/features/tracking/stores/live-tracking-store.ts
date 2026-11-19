import { httpResource } from '@angular/common/http';
import { Injectable, computed, effect, inject, linkedSignal, signal, untracked } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { ApiPaths } from 'qubefin-core';
import { FieldOfficer, unitIdsOf } from '../models/field-officer';
import { EmployeeRoute, LivePosition, LiveStatus } from '../models/live-position';
import { DayRouteService } from '../services/day-route.service';
import { GpsHistoryService } from '../services/gps-history.service';
import { LiveSocketMessage, LiveSocketService } from '../services/live-socket.service';
import { distanceMeters, toDateKey } from '../utils/geo-utils';
import { GeoPoint } from '../models/geo';
import { LiveGpsFix, LiveRosterEntry, MotionSegment, readActiveUsers, readGpsFixes, readMotion } from '../utils/live-message';
import { TrackingLookupStore } from './tracking-lookup-store';

/**
 * A fix older than this does not change the status shown, and an open motion period with no fix for this long means the phone
 * stopped reporting: Offline (the server calls someone Offline after about 3 missed fixes).
 */
const FRESH_FIX_MS = 10 * 60_000;
/** How often the page re-checks how old the last fix is, so a status ages into Offline without new data. */
const CLOCK_MS = 30_000;
/** Minimum time between trail reloads triggered by a reconnect. */
const TRAIL_RELOAD_MIN_MS = 60_000;

/** The selected person's motion state (`/motion` pushed, or the open period from `GET /api/v1/motion`). */
interface LiveState {
  status: LiveStatus;
  /** When the state began (ISO). */
  at: string;
  /** When the web learned it (ISO): compared with the roster's time, the newer news wins. */
  seenAt: string;
}

/** The latest `/active-users` roster: everyone active under the signed-in user (status other than OFFLINE). */
interface Roster {
  /** When it arrived (ISO). */
  at: string;
  entries: ReadonlyMap<string, LiveRosterEntry>;
}

/** Statuses a person listed as active cannot still have. */
const INACTIVE: ReadonlySet<LiveStatus> = new Set(['Offline']);

/** Motion states plotted on the map for the selected person (MOVING is the trail itself). */
const PLOTTED: ReadonlySet<LiveStatus> = new Set(['Idle', 'OnTask', 'Offline']);

/** A motion period of the selected person placed on the map. */
export interface MotionPoint extends MotionSegment {
  location: GeoPoint;
}

@Injectable({ providedIn: 'root' })
export class LiveTrackingStore {
  private readonly socket = inject(LiveSocketService);
  private readonly lookup = inject(TrackingLookupStore);
  private readonly gpsHistory = inject(GpsHistoryService);
  private readonly dayRoute = inject(DayRouteService);

  readonly branchId = signal<string | null>(null);

  readonly positionsResource = httpResource<LivePosition[]>(() => {
    const branchId = this.branchId();
    const params: Record<string, string> = {};
    if (branchId) params['branchId'] = branchId;
    return { url: `${ApiPaths.TRACKING}/live/positions`, params };
  });

  /** Newest pushed GPS fix per employee. A fix only wins over the polled position when it is newer (`lastSeenAt`). */
  private readonly liveFixes = signal<ReadonlyMap<string, LiveGpsFix>>(new Map());
  /** Motion state per employee (only the selected person's topics are followed). */
  private readonly liveStates = signal<ReadonlyMap<string, LiveState>>(new Map());
  /** The latest `/active-users` roster; null until the first one arrives (the polled statuses are shown until then). */
  private readonly roster = signal<Roster | null>(null);
  /** An `/active-users` roster has arrived: the list badges and the KPI counts come from it. */
  readonly hasRoster = computed(() => !!this.roster());
  /** Now, refreshed every 30 s while Live Tracking is open (see `followLive`). */
  private readonly clock = signal(Date.now());

  /**
   * Everyone the user may monitor (`field-officers`) in the selected branch, each with their latest position: the polled
   * one from `live/positions`, replaced by a newer live GPS fix. The **status** comes from the `/active-users` roster once one
   * has arrived (listed = their state, not listed = Offline), then from the selected person's `/motion`. People with no position
   * yet are listed too (no marker), so the list always shows the whole team of the branch.
   */
  readonly positions = computed(() =>
    teamPositions(
      this.positionsResource.hasValue() ? this.positionsResource.value() : [],
      { fixes: this.fixes(), states: this.liveStates(), roster: this.roster() },
      this.lookup.officers(),
      this.branchId(),
      this.clock(),
    ),
  );
  readonly loading = computed(() => this.positionsResource.isLoading() || this.lookup.loading());
  readonly error = computed(() => this.positionsResource.error());

  // --- Today's trail of the person clicked on Live Tracking ----------------------------------------------------------
  /**
   * The person whose trail is shown. On select, today's fixes up to now come from the GPS service
   * (`GET {gpsServiceUrl}/api/v1/gps?employeeId=`); after that the trail grows from the live socket only.
   */
  readonly trailEmployeeId = signal<string | null>(null);
  readonly trailEnabled = this.gpsHistory.enabled;

  private readonly trailResource = rxResource({
    params: () => (this.trailEnabled ? (this.trailEmployeeId() ?? undefined) : undefined),
    stream: ({ params: employeeId }) => this.gpsHistory.today(employeeId),
  });
  /** Live fixes of that person received after the history call; starts empty for each person. */
  private readonly trailLive = linkedSignal<string | null, LiveGpsFix[]>({
    source: this.trailEmployeeId,
    computation: () => [],
  });

  /** Today's trail, oldest first: the history from the GPS service, then the live fixes newer than its last point. */
  readonly trail = computed<LiveGpsFix[]>(() => {
    const history = this.trailResource.hasValue() ? this.trailResource.value() : [];
    const last = history.at(-1);
    const live = last ? this.trailLive().filter((f) => isNewer(f.at, last.at)) : this.trailLive();
    return history.length ? [...history, ...live] : live;
  });
  readonly trailLoading = computed(() => this.trailResource.isLoading());
  readonly trailError = computed(() => !!this.trailResource.error());
  /** Length of today's trail (straight lines between fixes). */
  readonly trailKm = computed(() => {
    const t = this.trail();
    let m = 0;
    for (let i = 1; i < t.length; i++) m += distanceMeters(t[i - 1].location, t[i].location);
    return m / 1000;
  });
  /** Fixes the phone flagged as a mock (fake) location. */
  readonly trailMockCount = computed(() => this.trail().filter((f) => f.mockLocation).length);

  /**
   * Today's motion periods of the same person (`GET {gpsServiceUrl}/api/v1/motion?employeeId=`), reloaded on each pushed
   * `/topic/employee/{id}/motion`.
   */
  private readonly motionResource = rxResource({
    params: () => (this.trailEnabled ? (this.trailEmployeeId() ?? undefined) : undefined),
    stream: ({ params: employeeId }) => this.gpsHistory.motionsToday(employeeId),
  });
  /**
   * Today's motion periods, newest first, from the first GPS fix of today (or midnight): some periods run for days with no
   * fix (e.g. MOVING from yesterday morning to 12:50 today, seen 19 Nov 2026), which says nothing about today.
   */
  readonly todayMotions = computed<MotionSegment[]>(() => {
    const list = this.motionResource.hasValue() ? this.motionResource.value() : [];
    const midnight = Date.parse(`${toDateKey()}T00:00:00`);
    const firstFix = this.trail()[0]?.at;
    const start = Math.max(midnight, firstFix ? Date.parse(firstFix) : midnight);
    const startIso = new Date(start).toISOString();
    return list
      .filter((m) => !m.to || Date.parse(m.to) > start)
      .map((m) => (Date.parse(m.from) < start ? { ...m, from: startIso } : m))
      .reverse();
  });
  /** The STOPPED, ON_TASK and OFFLINE periods of today, placed on the map (where they began). */
  readonly motionPoints = computed<MotionPoint[]>(() => {
    const trail = this.trail();
    return this.todayMotions()
      .filter((m) => PLOTTED.has(m.status))
      .map((m) => ({ ...m, location: placeOf(m, trail) }))
      .filter((m): m is MotionPoint => !!m.location);
  });
  readonly motionsError = computed(() => !!this.motionResource.error());

  /** Live fixes, plus the trail's last point when it is newer (places someone who is not in `live/positions` yet). */
  private readonly fixes = computed(() => {
    const fixes = this.liveFixes();
    const id = this.trailEmployeeId();
    const last = this.trail().at(-1);
    if (!id || !last) return fixes;
    const current = fixes.get(id);
    return current && !isNewer(last.at, current.at) ? fixes : new Map(fixes).set(id, last);
  });

  readonly countsByStatus = computed(() => {
    const counts: Record<LiveStatus, number> = { OnTask: 0, AtBranch: 0, Moving: 0, Idle: 0, Offline: 0 };
    this.positions().forEach((p) => counts[p.status]++);
    return counts;
  });

  // --- Route playback --------------------------------------------------------------------
  readonly routeEmployeeId = signal<string | null>(null);
  readonly routeDate = signal<string>(toDateKey());

  /** The day's route from the GPS service (see `DayRouteService`), the same as Tracking History. */
  readonly routeResource = rxResource<EmployeeRoute, { id: string; date: string } | undefined>({
    params: () => {
      const id = this.routeEmployeeId();
      return id ? { id, date: this.routeDate() } : undefined;
    },
    stream: ({ params }) => this.dayRoute.load(params.id, params.date),
  });

  readonly route = computed(() => (this.routeResource.hasValue() ? this.routeResource.value() : undefined));
  readonly routeLoading = computed(() => this.routeResource.isLoading());

  /**
   * Live updates while the calling screen is open (Live Tracking): the team roster (`/active-users` on the signed-in user's
   * topic) and the selected person's `/gps` and `/motion`. Call from the component constructor. Polling stays on.
   */
  followLive(): void {
    this.socket.watchTeam();
    this.socket.follow(() => this.trailEmployeeId());
    this.socket.gps$.pipe(takeUntilDestroyed()).subscribe((m) => this.applyGps(m));
    this.socket.motion$.pipe(takeUntilDestroyed()).subscribe((m) => this.applyMotion(m));
    this.socket.activeUsers$.pipe(takeUntilDestroyed()).subscribe((m) => this.applyActiveUsers(m));

    interval(CLOCK_MS).pipe(takeUntilDestroyed()).subscribe(() => this.clock.set(Date.now()));

    // The selected person's current motion period (still open) gives their status, like a pushed `/motion`, but only while
    // the phone is still reporting: the GPS service leaves a period open for hours after the last fix (e.g. MOVING from
    // 13:34 with the last fix at 14:38, Sushanta Roy, 19 Nov 2026), which must show Offline, not Moving.
    effect(() => {
      const open = this.todayMotions().find((m) => !m.to);
      if (!open) return;
      const state = openPeriodState(open, this.trail().at(-1)?.at ?? null, this.clock());
      untracked(() => this.setState(open.employeeId, state));
    });

    // Fixes pushed while the person's connection was down are missed: reload the trail when it is back, at most once a
    // minute (a connection that keeps dropping must not turn into a GPS-history call every few seconds).
    let previous = this.socket.personState();
    let lastReload = 0;
    effect(() => {
      const state = this.socket.personState();
      if (previous === 'Reconnecting' && state === 'Live' && Date.now() - lastReload > TRAIL_RELOAD_MIN_MS) {
        lastReload = Date.now();
        untracked(() => this.reloadTrail());
      }
      previous = state;
    });
  }

  reloadTrail() {
    if (!this.trailEmployeeId()) return;
    this.trailResource.reload();
    this.motionResource.reload();
  }

  /** The selected person's live connection is up (`/gps`, `/motion`); otherwise the screen refreshes the trail by polling. */
  readonly personLive = computed(() => this.socket.personState() === 'Live');
  readonly personState = this.socket.personState;

  refreshPositions() {
    this.positionsResource.reload();
  }

  refreshRoute() {
    if (this.routeEmployeeId()) this.routeResource.reload();
  }

  private applyGps(m: LiveSocketMessage) {
    readGpsFixes(m.employeeId, m.body, m.receivedAt).forEach((fix) => this.applyFix(fix));
  }

  /** `/motion` of the selected person: MOVING / STOPPED / ON_TASK / OFFLINE. */
  private applyMotion(m: LiveSocketMessage) {
    const motion = readMotion(m.employeeId, m.body, m.receivedAt);
    if (!motion) return;
    this.setState(motion.employeeId, { status: motion.status, at: motion.at, seenAt: m.receivedAt });
    // Reload today's periods so the new one is plotted (its position from the GPS service, checked against the trail).
    if (motion.employeeId === this.trailEmployeeId()) this.motionResource.reload();
  }

  /**
   * `/active-users`: the roster of the active people under the signed-in user. Each message replaces the last one: listed =
   * active (with their state when the entry has one), not listed = Offline.
   */
  private applyActiveUsers(m: LiveSocketMessage) {
    const list = readActiveUsers(m.body);
    if (!list) return;
    this.roster.set({ at: m.receivedAt, entries: new Map(list.map((e) => [e.employeeId, e])) });
    for (const e of list) if (e.location && e.at) this.placeAt(e.employeeId, e.location, e.at);
  }

  private setState(employeeId: string, state: LiveState) {
    const current = this.liveStates().get(employeeId);
    if (current && current.status === state.status && current.at === state.at) return;
    if (current && Date.parse(state.at) < Date.parse(current.at)) return;
    this.liveStates.update((map) => new Map(map).set(employeeId, state));
  }

  /** Moves the marker to a position that came with a state change (not a GPS fix: the trail does not grow). */
  private placeAt(employeeId: string, location: LiveGpsFix['location'], at: string) {
    const current = this.liveFixes().get(employeeId);
    if (current && !isNewer(at, current.at)) return;
    const fix: LiveGpsFix = {
      employeeId,
      location,
      at,
      speedKmph: null,
      accuracyMeters: null,
      batteryPct: null,
      gpsEnabled: null,
      status: null,
      distanceTodayKm: null,
      mockLocation: null,
    };
    this.liveFixes.update((f) => new Map(f).set(employeeId, fix));
  }

  private applyFix(fix: LiveGpsFix) {
    const current = this.liveFixes().get(fix.employeeId);
    if (current && !isNewer(fix.at, current.at)) return;
    this.liveFixes.update((f) => new Map(f).set(fix.employeeId, fix));

    // The clicked person's trail grows from the socket.
    if (fix.employeeId === this.trailEmployeeId()) {
      const last = this.trail().at(-1);
      if (!last || isNewer(fix.at, last.at)) this.trailLive.update((t) => [...t, fix]);
    }

    // Today's trail of the person on the map grows with each fix (the 30 s route poll replaces it with the server's).
    if (this.routeEmployeeId() !== fix.employeeId || this.routeDate() !== toDateKey() || !this.routeResource.hasValue()) return;
    this.routeResource.update((r) => {
      const last = r?.points.at(-1);
      if (!r?.isLive || (last && !isNewer(fix.at, last.at))) return r;
      return { ...r, points: [...r.points, { lat: fix.location.lat, lng: fix.location.lng, at: fix.at, speedKmph: fix.speedKmph }] };
    });
  }
}

function isNewer(at: string, than: string | null | undefined): boolean {
  if (!than) return true;
  const a = Date.parse(at);
  const b = Date.parse(than);
  return Number.isNaN(b) || a > b;
}

interface LiveUpdates {
  fixes: ReadonlyMap<string, LiveGpsFix>;
  states: ReadonlyMap<string, LiveState>;
  roster: Roster | null;
}

/**
 * The list on Live Tracking: one row per person in `field-officers` within the branch filter, with their polled position
 * (if any) and then the live fix, state and task applied. A polled position of someone not in `field-officers` is left
 * out (the user may not monitor them, §5 of the contract). Until `field-officers` has loaded, the polled list is shown as is.
 */
function teamPositions(
  polled: LivePosition[],
  live: LiveUpdates,
  officers: FieldOfficer[],
  branchId: string | null,
  now: number,
): LivePosition[] {
  if (!officers.length) return polled.map((p) => applyLive(p, live, now));
  const polledById = new Map(polled.map((p) => [p.employeeId, p]));
  return officers.filter((o) => inBranch(o, branchId)).map((o) => applyLive(polledById.get(o.id) ?? fromOfficer(o), live, now));
}

/**
 * Status from an open motion period: its state while the phone is reporting (a fix, or the period's own start, within
 * `FRESH_FIX_MS`), otherwise Offline. `at` stays the period's start, so a later pushed `/motion` still wins and a new
 * fix turns the person back to Moving / Stationary.
 */
function openPeriodState(open: MotionSegment, lastFixAt: string | null, now: number): LiveState {
  const seenAt = new Date(now).toISOString();
  if (INACTIVE.has(open.status)) return { status: open.status, at: open.from, seenAt };
  const lastSign = Math.max(Date.parse(open.from) || 0, lastFixAt ? Date.parse(lastFixAt) || 0 : 0);
  const status: LiveStatus = now - lastSign > FRESH_FIX_MS ? 'Offline' : open.status;
  return { status, at: open.from, seenAt };
}

/**
 * Branch filter, the same way `field-officers?organizationUnitId=` filters: anyone who may work in that branch (a CO / BM /
 * ABM posted there, and the AM / DM covering it).
 */
function inBranch(o: FieldOfficer, branchId: string | null): boolean {
  return !branchId || o.organizationUnitId === branchId || unitIdsOf(o).includes(branchId);
}

function applyLive(p: LivePosition, live: LiveUpdates, now: number): LivePosition {
  const id = p.employeeId;
  const candidate = live.fixes.get(id);
  const fix = candidate && isNewer(candidate.at, p.lastSeenAt) ? candidate : undefined;
  const state = live.states.get(id);
  if (!fix && !state && !live.roster) return p;

  const next: LivePosition = fix
    ? {
        ...p,
        location: fix.location,
        lastSeenAt: fix.at,
        speedKmph: fix.speedKmph ?? p.speedKmph,
        accuracyMeters: fix.accuracyMeters ?? p.accuracyMeters,
        batteryPct: fix.batteryPct ?? p.batteryPct,
        gpsEnabled: fix.gpsEnabled ?? p.gpsEnabled,
        distanceTodayKm: fix.distanceTodayKm ?? p.distanceTodayKm,
      }
    : p;
  return { ...next, status: liveStatus(p.status, fix, state, live.roster, id, now) };
}

/**
 * Status shown:
 * 1. the `/active-users` roster once one has arrived: listed = the entry's state (or, without one, the polled status if it
 *    is an active one, else Stationary); not listed = Offline. Before the first roster: the polled status.
 * 2. the selected person's motion state, when the web learned it after the roster;
 * 3. what a newer, fresh GPS fix proves (GPS switched off = Offline, or someone shown Offline is reporting again).
 */
function liveStatus(
  polled: LiveStatus,
  fix: LiveGpsFix | undefined,
  state: LiveState | undefined,
  roster: Roster | null,
  id: string,
  now: number,
): LiveStatus {
  let status = polled;
  if (roster) {
    const entry = roster.entries.get(id);
    status = !entry ? 'Offline' : (entry.status ?? (INACTIVE.has(polled) ? 'Idle' : polled));
  }
  if (state && (!roster || !isNewer(roster.at, state.seenAt))) status = state.status;
  if (!fix || (state && !isNewer(fix.at, state.at))) return status;
  if (fix.status) return fix.status;
  // An old fix (e.g. the last point of today's trail, an hour ago) says nothing about now.
  if (now - Date.parse(fix.at) > FRESH_FIX_MS) return status;
  // GPS switched off on the phone counts as Offline (no GPS Off status on Live Tracking).
  if (fix.gpsEnabled === false) return 'Offline';
  if (status === 'Offline') return fix.speedKmph !== null && fix.speedKmph < 2 ? 'Idle' : 'Moving';
  return status;
}

/**
 * Where a motion period is drawn: its own position, unless that is far (> 50 km) from the GPS fix taken closest in time and
 * the swapped pair is right there (MOVING records came with latitude and longitude swapped, 19 Nov 2026); without a position,
 * the fix closest in time.
 */
function placeOf(m: MotionSegment, trail: LiveGpsFix[]): GeoPoint | null {
  const t = Date.parse(m.from);
  let ref: LiveGpsFix | undefined;
  for (const f of trail) if (!ref || Math.abs(Date.parse(f.at) - t) < Math.abs(Date.parse(ref.at) - t)) ref = f;
  const p = m.location;
  if (!p) return ref?.location ?? null;
  if (!ref || Math.abs(p.lng) > 90) return p;
  const d = distanceMeters(p, ref.location);
  const swapped = { lat: p.lng, lng: p.lat };
  return d > 50_000 && distanceMeters(swapped, ref.location) < d / 10 ? swapped : p;
}

/** Someone on the team with no polled position: listed as Offline with no marker until a fix arrives. */
function fromOfficer(o: FieldOfficer): LivePosition {
  return {
    employeeId: o.id,
    employeeName: o.name.replace(/\s+/g, ' ').trim(),
    role: o.role,
    branchId: o.organizationUnitId,
    // Branch for a CO / BM / ABM, area or division for an AM / DM.
    branchName: o.unitName || o.organizationUnitName,
    location: null,
    accuracyMeters: null,
    speedKmph: null,
    lastSeenAt: null,
    gpsEnabled: true,
    status: 'Offline',
    punchedInAt: null,
    currentTaskId: null,
    currentTaskTitle: null,
    currentJobId: null,
    currentJobNo: null,
    openTaskCount: 0,
    distanceTodayKm: null,
    distanceFromBranchKm: null,
    batteryPct: null,
    openAlertCount: 0,
  };
}
