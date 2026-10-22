import { DatePipe, DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { GoogleMap, MapAdvancedMarker, MapCircle, MapPolyline } from '@angular/google-maps';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { ApiPaths } from 'qubefin-core';
import { EmployeeRoute, RoadPathPoint, RouteStop, RouteTaskPoint } from '../../models/live-position';
import { GeoPoint } from '../../models/geo';
import { RoadsService, pathKm } from '../../services/roads.service';
import { MAX_ROUTE_STOPS, PlannedRoute, RoutingService, TRAVEL_MODE_LABEL, formatDuration } from '../../services/routing.service';
import { MapsLoaderService } from '../../services/maps-loader.service';
import { TrackingLookupStore } from '../../stores/tracking-lookup-store';
import { TrackingSettingsStore } from '../../stores/tracking-settings-store';
import { DEFAULT_CENTER, centroid, distanceMeters, formatDistance, toDateKey } from '../../utils/geo-utils';
import { MarkerContentCache } from '../../utils/marker-content';
import { TRACKING_POLL_MS, pollWhileVisible } from '../../utils/poll';
import { ROLE_LABEL, STOP_KIND, TASK_TYPE, TASK_TYPE_CODE } from '../../utils/tracking-labels';
import { MapStatus } from '../../components/shared/map-status/map-status';
import { TrackingChip } from '../../components/shared/tracking-chip/tracking-chip';

type StopFilter = 'all' | 'Designated' | 'Undesignated';

/**
 * Day-wise route of one employee: live while the day is running, playback afterwards.
 * Stops are designated (at a task point of their jobs, or the branch) or undesignated (anywhere else).
 */
@Component({
  selector: 'qfin-route-history',
  imports: [DatePipe, DecimalPipe, RouterLink, MatFormFieldModule, MatSelectModule, MatTooltipModule, LucideDynamicIcon, GoogleMap, MapAdvancedMarker, MapCircle, MapPolyline, MapStatus, TrackingChip],
  templateUrl: './route-history.html',
})
export class RouteHistory {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly lookup = inject(TrackingLookupStore);
  readonly maps = inject(MapsLoaderService);
  private readonly settingsStore = inject(TrackingSettingsStore);
  private readonly roads = inject(RoadsService);
  private readonly routing = inject(RoutingService);
  readonly formatDuration = formatDuration;
  readonly TRAVEL_MODE_LABEL = TRAVEL_MODE_LABEL;
  readonly MAX_ROUTE_STOPS = MAX_ROUTE_STOPS;

  readonly ROLE_LABEL = ROLE_LABEL;
  readonly STOP_KIND = STOP_KIND;
  readonly TASK_TYPE = TASK_TYPE;
  readonly formatDistance = formatDistance;
  readonly pollSeconds = TRACKING_POLL_MS / 1000;
  readonly speeds = [1, 2, 4, 8];
  private readonly markers = new MarkerContentCache();

  readonly employeeId = signal<string | null>(this.route.snapshot.queryParamMap.get('employee'));
  readonly date = signal(this.route.snapshot.queryParamMap.get('date') ?? toDateKey());
  readonly stopFilter = signal<StopFilter>('all');
  readonly panel = signal<'stops' | 'tasks'>('stops');
  readonly selectedStop = signal<number | null>(null);

  readonly officer = computed(() => (this.employeeId() ? this.lookup.officerById().get(this.employeeId()!) : undefined));
  readonly homeRadius = computed(() => this.settingsStore.settings()?.homeRadiusMeters ?? 50);

  private readonly routeResource = httpResource<EmployeeRoute>(() => {
    const id = this.employeeId();
    return id ? { url: `${ApiPaths.TRACKING}/employees/${id}/route`, params: { date: this.date() } } : undefined;
  });
  readonly data = computed(() => (this.employeeId() ? this.routeResource.value() : undefined));
  readonly loading = computed(() => this.routeResource.isLoading());
  readonly isToday = computed(() => this.date() === toDateKey());

  readonly stops = computed(() => {
    const f = this.stopFilter();
    return (this.data()?.stops ?? []).filter((s) => f === 'all' || s.kind === f);
  });

  // --- Playback ------------------------------------------------------------------------------
  readonly playIndex = signal(0);
  readonly playing = signal(false);
  readonly speed = signal(2);
  private timer: number | null = null;

  readonly points = computed(() => this.data()?.points ?? []);
  readonly playedPath = computed(() => this.points().slice(0, this.playIndex() + 1));

  // --- Road-snapped trail (Roads API) and planned route (Routes API) ---------------------------
  /** Show the trail snapped to roads instead of straight lines between GPS fixes. */
  readonly roadSnap = signal(true);
  readonly roadPath = signal<RoadPathPoint[] | null>(null);
  readonly snapping = signal(false);
  readonly snapError = signal<string | null>(null);
  private snapToken = 0;
  /** Road distance: from the backend when it pre-snaps, else from the snapped path. */
  readonly roadKm = computed(() => {
    const r = this.data();
    if (r?.roadDistanceKm != null) return r.roadDistanceKm;
    const p = this.roadPath();
    return p && p.length > 1 ? pathKm(p) : null;
  });
  private readonly useRoad = computed(() => this.roadSnap() && !!this.roadPath()?.length);
  /** Whole-day line and the part already played, on roads when snapped. */
  readonly linePath = computed<GeoPoint[]>(() => (this.useRoad() ? this.roadPath()! : this.points()));
  readonly playedLinePath = computed<GeoPoint[]>(() => {
    if (!this.useRoad()) return this.playedPath();
    const idx = this.playIndex();
    const road = this.roadPath()!;
    let end = road.length;
    for (let i = 0; i < road.length; i++) {
      if (road[i].pointIndex > idx) {
        end = i;
        break;
      }
    }
    return road.slice(0, end);
  });

  /** `visited`: through the task points visited that day (compared with the actual km); `planned`: none visited, all of them. */
  readonly plan = signal<{ key: string; route: PlannedRoute; from: string; to: string; scope: 'visited' | 'planned' } | null>(null);
  readonly planLoading = signal(false);
  readonly planError = signal<string | null>(null);
  private readonly dayKey = computed(() => {
    const r = this.data();
    return r ? `${r.employeeId}|${r.date}` : '';
  });
  readonly activePlan = computed(() => {
    const p = this.plan();
    return p && p.key === this.dayKey() ? p : null;
  });
  readonly planLine: google.maps.PolylineOptions = {
    strokeOpacity: 0,
    icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.9, strokeColor: '#7C3AED', scale: 4 }, offset: '0', repeat: '14px' }],
    clickable: false,
  };
  /** Actual road distance vs the planned (best-order) distance, in %. */
  readonly extraPct = computed(() => {
    const p = this.activePlan();
    const actual = this.roadKm() ?? this.data()?.summary.totalDistanceKm ?? null;
    if (!p || p.scope !== 'visited' || actual == null || !p.route.distanceMeters) return null;
    return Math.round(((actual * 1000 - p.route.distanceMeters) / p.route.distanceMeters) * 100);
  });
  readonly current = computed(() => this.points()[Math.min(this.playIndex(), Math.max(0, this.points().length - 1))]);
  /** Distance covered up to the play head. */
  readonly distanceSoFar = computed(() => {
    const pts = this.playedLinePath();
    let m = 0;
    for (let i = 1; i < pts.length; i++) m += distanceMeters(pts[i - 1], pts[i]);
    return m;
  });
  /** Stop the play head is in, if any. */
  readonly currentStop = computed(() => {
    const p = this.current();
    if (!p) return null;
    const t = new Date(p.at).getTime();
    return (this.data()?.stops ?? []).find((s) => new Date(s.from).getTime() <= t && new Date(s.to).getTime() >= t) ?? null;
  });

  // --- Map -----------------------------------------------------------------------------------
  readonly mapOptions: google.maps.MapOptions = { streetViewControl: false, mapTypeControl: true, fullscreenControl: true, clickableIcons: false };
  readonly center = signal(DEFAULT_CENTER);
  readonly zoom = signal(12);

  readonly routeLine: google.maps.PolylineOptions = { strokeColor: '#94A3B8', strokeOpacity: 0.9, strokeWeight: 4, clickable: false };
  readonly playedLine: google.maps.PolylineOptions = { strokeColor: '#2563EB', strokeOpacity: 0.95, strokeWeight: 5, clickable: false };
  readonly homeCircle: google.maps.CircleOptions = { strokeColor: '#D97706', strokeWeight: 1.5, fillColor: '#D97706', fillOpacity: 0.18, clickable: false };

  readonly stopMarkers = computed(() =>
    (this.data()?.stops ?? []).map((s) => ({
      stop: s,
      title: `${s.seq}. ${s.label ?? 'Undesignated stop'} · ${s.durationMinutes} min`,
      content: this.markers.badge(`s-${s.seq}`, `${s.seq}`, STOP_KIND[s.kind].color, { selected: this.selectedStop() === s.seq }),
    })),
  );

  readonly taskPointMarkers = computed(() =>
    (this.data()?.taskPoints ?? []).map((p) => ({
      point: p,
      title: `${p.taskNo} · ${p.title} · ${this.pointState(p)}`,
      content: this.markers.pin(`tp-${p.taskId}`, TASK_TYPE_CODE[p.type], this.pointColor(p), { small: true }),
      circle: { strokeColor: this.pointColor(p), strokeWeight: 1, fillColor: this.pointColor(p), fillOpacity: 0.08, clickable: false } as google.maps.CircleOptions,
    })),
  );

  readonly branchMarker = computed(() => {
    const b = this.officer() ? this.lookup.branchById().get(this.officer()!.branchId) : undefined;
    return b?.location ? { position: b.location, title: `${b.name} Branch`, content: this.markers.pin('branch', b.code, '#0F172A', { small: true }) } : null;
  });
  readonly homeMarker = computed(() => {
    const h = this.officer()?.homeLocation;
    return h ? { position: h, content: this.markers.pin('home', '⌂', '#D97706', { small: true }) } : null;
  });
  readonly headMarker = computed(() => {
    const p = this.current();
    return p ? { position: { lat: p.lat, lng: p.lng }, content: this.markers.dot('head', this.data()?.isLive && this.playIndex() === this.points().length - 1 ? '#16A34A' : '#0F172A', 16) } : null;
  });

  constructor() {
    this.maps.load().catch(() => undefined);
    pollWhileVisible(() => {
      if (this.isToday() && this.employeeId()) this.routeResource.reload();
    });
    this.destroyRef.onDestroy(() => this.pause());

    // Snap the trail to roads (backend path if given; otherwise Roads API, only new fixes on a live day).
    let snappedKey = '';
    effect(() => {
      const r = this.data();
      const on = this.roadSnap();
      if (!r) return;
      const key = `${r.employeeId}|${r.date}`;
      untracked(() => {
        if (key !== snappedKey) {
          snappedKey = key;
          this.roadPath.set(null);
          this.snapError.set(null);
        }
        if (!on) return;
        if (r.roadPath?.length) {
          this.roadPath.set(r.roadPath);
          return;
        }
        if (r.points.length < 2) return;
        const token = ++this.snapToken;
        this.snapping.set(true);
        this.roads
          .snap(key, r.points)
          .then((path) => {
            if (token === this.snapToken) {
              this.roadPath.set(path);
              this.snapError.set(null);
            }
          })
          .catch((err) => {
            if (token === this.snapToken) this.snapError.set(err instanceof Error ? err.message : 'Road snapping failed.');
          })
          .finally(() => {
            if (token === this.snapToken) this.snapping.set(false);
          });
      });
    });

    // New day / employee → show the whole day, fit the map.
    let lastKey = '';
    effect(() => {
      const r = this.data();
      const key = r ? `${r.employeeId}|${r.date}` : '';
      if (!r) return;
      const atEnd = this.playIndex() >= this.points().length - 2;
      if (key !== lastKey) {
        lastKey = key;
        this.pause();
        this.selectedStop.set(null);
        this.playIndex.set(Math.max(0, r.points.length - 1));
        const pts = [...r.points, ...r.taskPoints.map((p) => p.location)];
        this.center.set(centroid(pts.length ? pts : [this.officer()?.homeLocation ?? DEFAULT_CENTER], DEFAULT_CENTER));
        this.zoom.set(12);
      } else if (atEnd && !this.playing()) {
        // Live day: keep the head at the latest fix.
        this.playIndex.set(Math.max(0, r.points.length - 1));
      }
    });
  }

  // --- Selection -----------------------------------------------------------------------------
  setEmployee(id: string | null) {
    this.employeeId.set(id);
    this.syncUrl();
  }

  setDate(date: string) {
    if (!date) return;
    this.date.set(date);
    this.syncUrl();
  }

  shiftDay(days: number) {
    const d = new Date(`${this.date()}T12:00:00`);
    d.setDate(d.getDate() + days);
    const key = toDateKey(d);
    if (key <= toDateKey()) this.setDate(key);
  }

  goToday() {
    this.setDate(toDateKey());
  }

  today() {
    return toDateKey();
  }

  private syncUrl() {
    this.router.navigate([], { queryParams: { employee: this.employeeId(), date: this.date() }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  focusStop(s: RouteStop) {
    this.selectedStop.set(s.seq);
    this.center.set({ ...s.location });
    this.zoom.set(16);
    const idx = this.points().findIndex((p) => new Date(p.at).getTime() >= new Date(s.from).getTime());
    if (idx >= 0) {
      this.pause();
      this.playIndex.set(idx);
    }
  }

  focusPoint(p: RouteTaskPoint) {
    this.center.set({ ...p.location });
    this.zoom.set(16);
  }

  pointState(p: RouteTaskPoint): string {
    if (p.completedAt) return 'completed this day';
    if (p.status === 'Completed') return 'completed earlier';
    return p.visited ? 'visited, not completed' : 'not visited';
  }

  pointColor(p: RouteTaskPoint): string {
    if (p.completedAt) return '#16A34A';
    if (p.visited) return '#7C3AED';
    return '#94A3B8';
  }

  /**
   * Best-order road route (two-wheeler) through the task points the employee visited that day — so it can be compared
   * with the km actually travelled — or through all planned points when none was visited. From the first GPS fix
   * (or the branch) to the last fix once the day is over (or back to the branch while it runs).
   */
  async togglePlan() {
    if (this.activePlan()) {
      this.plan.set(null);
      return;
    }
    const r = this.data();
    if (!r?.taskPoints.length) return;
    const branch = this.officer() ? this.lookup.branchById().get(this.officer()!.branchId) : undefined;
    const first = r.points[0];
    const last = r.points[r.points.length - 1];
    const origin: GeoPoint | null = first ? { lat: first.lat, lng: first.lng } : (branch?.location ?? null);
    const ended = !r.isLive && !!last;
    const destination: GeoPoint | null = ended ? { lat: last.lat, lng: last.lng } : (branch?.location ?? origin);
    if (!origin) {
      this.planError.set('No start point for this day.');
      return;
    }
    this.planLoading.set(true);
    this.planError.set(null);
    try {
      const visited = r.taskPoints.filter((p) => p.visited || !!p.completedAt);
      const scope = visited.length ? 'visited' : 'planned';
      const stops = (visited.length ? visited : r.taskPoints).map((p) => p.location);
      const route = await this.routing.plan(origin, stops, { destination, optimize: true });
      this.plan.set({
        key: `${r.employeeId}|${r.date}`,
        route,
        scope,
        from: first ? 'the first GPS fix' : `${branch?.name} branch`,
        to: ended ? 'the last GPS fix' : `${branch?.name ?? 'the'} branch`,
      });
    } catch (err) {
      this.planError.set(err instanceof Error ? err.message : 'Route could not be calculated.');
    } finally {
      this.planLoading.set(false);
    }
  }

  // --- Playback controls ---------------------------------------------------------------------
  play() {
    const n = this.points().length;
    if (!n) return;
    if (this.playIndex() >= n - 1) this.playIndex.set(0);
    this.playing.set(true);
    this.restartTimer();
  }

  private restartTimer() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = window.setInterval(() => {
      const next = this.playIndex() + 1;
      if (next >= this.points().length) return this.pause();
      this.playIndex.set(next);
    }, 240 / this.speed());
  }

  pause() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.playing.set(false);
  }

  setSpeed(s: number) {
    this.speed.set(s);
    if (this.playing()) this.restartTimer();
  }

  scrub(value: string) {
    this.pause();
    this.playIndex.set(+value);
  }

  hours(mins: number): string {
    const h = Math.floor(mins / 60);
    return h ? `${h} h ${mins % 60} m` : `${mins} m`;
  }
}
