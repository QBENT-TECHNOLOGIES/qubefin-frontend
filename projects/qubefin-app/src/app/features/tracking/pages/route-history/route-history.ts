import { DatePipe, DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { GoogleMap, MapAdvancedMarker, MapCircle, MapPolyline } from '@angular/google-maps';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { ApiPaths } from 'qubefin-core';
import { EmployeeRoute, RouteStop, RouteTaskPoint } from '../../models/live-position';
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
  readonly current = computed(() => this.points()[Math.min(this.playIndex(), Math.max(0, this.points().length - 1))]);
  /** Distance covered up to the play head. */
  readonly distanceSoFar = computed(() => {
    const pts = this.playedPath();
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
