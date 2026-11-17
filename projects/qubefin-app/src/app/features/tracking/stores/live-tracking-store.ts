import { httpResource } from '@angular/common/http';
import { Injectable, computed, effect, inject, linkedSignal, signal, untracked } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiPaths } from 'qubefin-core';
import { FieldOfficer, unitIdsOf } from '../models/field-officer';
import { EmployeeRoute, LivePosition, LiveStatus } from '../models/live-position';
import { GpsHistoryService } from '../services/gps-history.service';
import { LiveSocketMessage, LiveSocketService } from '../services/live-socket.service';
import { distanceMeters, toDateKey } from '../utils/geo-utils';
import { LiveGpsFix, readGpsFix } from '../utils/live-message';
import { TrackingLookupStore } from './tracking-lookup-store';

@Injectable({ providedIn: 'root' })
export class LiveTrackingStore {
  private readonly socket = inject(LiveSocketService);
  private readonly lookup = inject(TrackingLookupStore);
  private readonly gpsHistory = inject(GpsHistoryService);

  readonly branchId = signal<string | null>(null);

  readonly positionsResource = httpResource<LivePosition[]>(() => {
    const branchId = this.branchId();
    const params: Record<string, string> = {};
    if (branchId) params['branchId'] = branchId;
    return { url: `${ApiPaths.TRACKING}/live/positions`, params };
  });

  /** Newest pushed GPS fix per employee. A fix only wins over the polled position when it is newer (`lastSeenAt`). */
  private readonly liveFixes = signal<ReadonlyMap<string, LiveGpsFix>>(new Map());
  /** Alarms pushed since the last poll, per employee; the next poll's `openAlertCount` already includes them. */
  private readonly liveAlarms = linkedSignal<LivePosition[] | undefined, ReadonlyMap<string, number>>({
    source: () => (this.positionsResource.hasValue() ? this.positionsResource.value() : undefined),
    computation: () => new Map(),
  });

  /**
   * Everyone the user may monitor (`field-officers`) in the selected branch, each with their latest position: the polled
   * one from `live/positions`, replaced by a newer live GPS fix. People with no position yet are listed too (status Offline,
   * no marker), so the list always shows the whole team of the branch.
   */
  readonly positions = computed(() =>
    teamPositions(
      this.positionsResource.hasValue() ? this.positionsResource.value() : [],
      this.fixes(),
      this.liveAlarms(),
      this.lookup.officers(),
      this.branchId(),
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
    const counts: Record<LiveStatus, number> = { OnTask: 0, AtBranch: 0, Moving: 0, Idle: 0, GpsOff: 0, Offline: 0, NotPunchedIn: 0, PunchedOut: 0 };
    this.positions().forEach((p) => counts[p.status]++);
    return counts;
  });

  // --- Route playback --------------------------------------------------------------------
  readonly routeEmployeeId = signal<string | null>(null);
  readonly routeDate = signal<string>(toDateKey());

  readonly routeResource = httpResource<EmployeeRoute>(() => {
    const id = this.routeEmployeeId();
    if (!id) return undefined;
    return { url: `${ApiPaths.TRACKING}/employees/${id}/route`, params: { date: this.routeDate() } };
  });

  readonly route = computed(() => this.routeResource.value());
  readonly routeLoading = computed(() => this.routeResource.isLoading());

  /**
   * Live GPS and alarms for everyone the user may monitor, while the calling screen is open (Live Tracking).
   * Call from the component constructor. Polling stays on: it brings the server's statuses (OnTask, AtBranch…) and
   * covers the time the socket is down.
   */
  followLive(): void {
    this.socket.watchEmployees(() => this.lookup.officers().map((o) => o.id));
    this.socket.gps$.pipe(takeUntilDestroyed()).subscribe((m) => this.applyGps(m));
    this.socket.alarms$
      .pipe(takeUntilDestroyed())
      .subscribe((m) => this.liveAlarms.update((c) => new Map(c).set(m.employeeId, (c.get(m.employeeId) ?? 0) + 1)));

    // Fixes pushed while the socket was down are missed: reload the trail when it is back.
    let previous = this.socket.state();
    effect(() => {
      const state = this.socket.state();
      if (previous === 'Reconnecting' && state === 'Live') untracked(() => this.reloadTrail());
      previous = state;
    });
  }

  reloadTrail() {
    if (this.trailEmployeeId()) this.trailResource.reload();
  }

  refreshPositions() {
    this.positionsResource.reload();
  }

  refreshRoute() {
    if (this.routeEmployeeId()) this.routeResource.reload();
  }

  private applyGps(m: LiveSocketMessage) {
    const fix = readGpsFix(m.employeeId, m.body, m.receivedAt);
    if (!fix) return;
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

/**
 * The list on Live Tracking: one row per person in `field-officers` within the branch filter, with their polled position
 * (if any) and then the live fix and alarm count applied. A polled position of someone not in `field-officers` is left
 * out (the user may not monitor them, §5 of the contract). Until `field-officers` has loaded, the polled list is shown as is.
 */
function teamPositions(
  polled: LivePosition[],
  fixes: ReadonlyMap<string, LiveGpsFix>,
  alarms: ReadonlyMap<string, number>,
  officers: FieldOfficer[],
  branchId: string | null,
): LivePosition[] {
  if (!officers.length) return polled.map((p) => applyLive(p, fixes.get(p.employeeId), alarms.get(p.employeeId) ?? 0));
  const polledById = new Map(polled.map((p) => [p.employeeId, p]));
  return officers
    .filter((o) => inBranch(o, branchId))
    .map((o) => applyLive(polledById.get(o.id) ?? fromOfficer(o), fixes.get(o.id), alarms.get(o.id) ?? 0));
}

/**
 * Branch filter, the same way `field-officers?organizationUnitId=` filters: anyone who may work in that branch (a CO / BM /
 * ABM posted there, and the AM / DM covering it).
 */
function inBranch(o: FieldOfficer, branchId: string | null): boolean {
  return !branchId || o.organisationUnitId === branchId || unitIdsOf(o).includes(branchId);
}

function applyLive(p: LivePosition, fix: LiveGpsFix | undefined, newAlarms: number): LivePosition {
  const next = newAlarms ? { ...p, openAlertCount: p.openAlertCount + newAlarms } : p;
  if (!fix || !isNewer(fix.at, p.lastSeenAt)) return next;
  return {
    ...next,
    location: fix.location,
    lastSeenAt: fix.at,
    speedKmph: fix.speedKmph ?? next.speedKmph,
    accuracyMeters: fix.accuracyMeters ?? next.accuracyMeters,
    batteryPct: fix.batteryPct ?? next.batteryPct,
    gpsEnabled: fix.gpsEnabled ?? next.gpsEnabled,
    distanceTodayKm: fix.distanceTodayKm ?? next.distanceTodayKm,
    status: liveStatus(next.status, fix),
  };
}

/**
 * The server works out OnTask / AtBranch / Idle etc. on each poll. Between polls the web only changes what a fix proves:
 * GPS off, or someone who was Offline / GPS off is reporting again.
 */
function liveStatus(prev: LiveStatus, fix: LiveGpsFix): LiveStatus {
  if (fix.status) return fix.status;
  if (fix.gpsEnabled === false) return 'GpsOff';
  if (prev === 'Offline' || prev === 'GpsOff') return fix.speedKmph !== null && fix.speedKmph < 2 ? 'Idle' : 'Moving';
  return prev;
}

/** Someone on the team with no polled position: listed as Offline with no marker until a fix arrives. */
function fromOfficer(o: FieldOfficer): LivePosition {
  return {
    employeeId: o.id,
    employeeName: o.name.replace(/\s+/g, ' ').trim(),
    role: o.role,
    branchId: o.organisationUnitId,
    // Branch for a CO / BM / ABM, area or division for an AM / DM.
    branchName: o.unitName || o.organisationUnitName,
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
