import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { GoogleMap, MapAdvancedMarker, MapCircle, MapPolyline } from '@angular/google-maps';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { LivePosition, LiveStatus } from '../../models/live-position';
import { MapsLoaderService } from '../../services/maps-loader.service';
import { LiveTrackingStore } from '../../stores/live-tracking-store';
import { TrackingLookupStore } from '../../stores/tracking-lookup-store';
import { TrackingSettingsStore } from '../../stores/tracking-settings-store';
import { DEFAULT_CENTER, centroid, distanceMeters, formatDistance, toDateKey } from '../../utils/geo-utils';
import { MarkerContentCache, initials } from '../../utils/marker-content';
import { TRACKING_POLL_MS, pollWhileVisible } from '../../utils/poll';
import { LIVE_STATUS, ROLE_LABEL, STOP_KIND } from '../../utils/tracking-labels';
import { MapStatus } from '../../components/shared/map-status/map-status';
import { TrackingChip } from '../../components/shared/tracking-chip/tracking-chip';
import { TrkDateField } from '../../components/shared/date-field/trk-date-field';

type StatusFilter = LiveStatus | 'All';

@Component({
  selector: 'qfin-live-map',
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    MatFormFieldModule,
    MatSelectModule,
    MatTooltipModule,
    LucideDynamicIcon,
    GoogleMap,
    MapAdvancedMarker,
    MapCircle,
    MapPolyline,
    MapStatus,
    TrackingChip,
    TrkDateField,
  ],
  templateUrl: './live-map.html',
})
export class LiveMap {
  readonly store = inject(LiveTrackingStore);
  readonly lookup = inject(TrackingLookupStore);
  readonly maps = inject(MapsLoaderService);
  private readonly settingsStore = inject(TrackingSettingsStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly LIVE_STATUS = LIVE_STATUS;
  readonly ROLE_LABEL = ROLE_LABEL;
  readonly formatDistance = formatDistance;
  readonly initials = initials;
  readonly pollSeconds = TRACKING_POLL_MS / 1000;
  private readonly markers = new MarkerContentCache();

  readonly statusFilter = signal<StatusFilter>('All');
  readonly search = signal('');
  readonly selectedId = signal<string | null>(null);
  readonly showBranchRadius = signal(true);
  readonly showRoute = signal(false);
  readonly lastUpdated = signal<Date>(new Date());
  readonly now = signal(Date.now());

  readonly homeRadius = computed(() => this.settingsStore.settings()?.homeRadiusMeters ?? 50);

  readonly statusChips = computed(() => {
    const counts = this.store.countsByStatus();
    const total = this.store.positions().length;
    return [
      { key: 'All' as StatusFilter, label: 'All', count: total, color: '#334155' },
      ...(Object.keys(LIVE_STATUS) as LiveStatus[]).map((k) => ({ key: k as StatusFilter, label: LIVE_STATUS[k].label, count: counts[k], color: LIVE_STATUS[k].color })),
    ];
  });

  readonly people = computed(() => {
    const text = this.search().trim().toLowerCase();
    const f = this.statusFilter();
    return this.store
      .positions()
      .filter((p) => (f === 'All' || p.status === f) && (!text || p.employeeName.toLowerCase().includes(text)))
      .sort((a, b) => b.openAlertCount - a.openAlertCount || a.employeeName.localeCompare(b.employeeName));
  });

  readonly selected = computed(() => this.store.positions().find((p) => p.employeeId === this.selectedId()) ?? null);
  readonly selectedOfficer = computed(() => (this.selectedId() ? this.lookup.officerById().get(this.selectedId()!) : undefined));

  // --- Map layers ---------------------------------------------------------------------------
  readonly center = signal(DEFAULT_CENTER);
  readonly zoom = signal(9);

  readonly personMarkers = computed(() =>
    this.people()
      .filter((p) => !!p.location)
      .map((p) => ({
        id: p.employeeId,
        position: p.location!,
        title: `${p.employeeName} · ${LIVE_STATUS[p.status].label}`,
        content: this.markers.badge(`p-${p.employeeId}`, initials(p.employeeName), LIVE_STATUS[p.status].color, {
          selected: p.employeeId === this.selectedId(),
          pulse: p.openAlertCount > 0,
        }),
        zIndex: p.employeeId === this.selectedId() ? 1000 : p.openAlertCount ? 500 : 100,
      })),
  );

  readonly branchMarkers = computed(() =>
    this.lookup
      .branches()
      .filter((b) => !!b.location && (!this.store.branchId() || b.id === this.store.branchId()))
      .map((b) => ({ ...b, location: b.location!, content: this.markers.pin(`b-${b.id}`, b.code, '#0F172A', { small: true }) })),
  );

  readonly homeMarker = computed(() => {
    const o = this.selectedOfficer();
    return o?.homeLocation ? { position: o.homeLocation, content: this.markers.pin('home', '⌂', '#D97706', { small: true }) } : null;
  });

  // --- Route playback ------------------------------------------------------------------------
  readonly route = this.store.route;
  readonly playIndex = signal(0);
  readonly playing = signal(false);
  private timer: number | null = null;

  readonly routePath = computed(() => (this.showRoute() ? (this.route()?.points ?? []) : []));
  readonly playedPath = computed(() => this.routePath().slice(0, this.playIndex() + 1));
  readonly playHead = computed(() => {
    const pts = this.routePath();
    if (!pts.length) return null;
    const p = pts[Math.min(this.playIndex(), pts.length - 1)];
    return { point: p, content: this.markers.dot('head', '#0F172A', 16) };
  });
  readonly stopMarkers = computed(() =>
    this.showRoute()
      ? (this.route()?.stops ?? []).map((s, i) => ({
          key: `s${i}`,
          position: s.location,
          title: `${s.seq}. ${s.label ?? 'Undesignated stop'} · ${s.durationMinutes} min (${new Date(s.from).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })})`,
          content: this.markers.pin(`stop-${i}`, `${s.durationMinutes}′`, STOP_KIND[s.kind].color, { small: true }),
        }))
      : [],
  );

  readonly routeLine: google.maps.PolylineOptions = { strokeColor: '#94A3B8', strokeOpacity: 0.9, strokeWeight: 4, clickable: false };
  readonly playedLine: google.maps.PolylineOptions = { strokeColor: '#2563EB', strokeOpacity: 0.95, strokeWeight: 5, clickable: false };
  readonly branchCircle: google.maps.CircleOptions = { strokeColor: '#0F172A', strokeOpacity: 0.35, strokeWeight: 1, fillColor: '#0F172A', fillOpacity: 0.03, clickable: false };
  readonly homeCircle: google.maps.CircleOptions = { strokeColor: '#D97706', strokeWeight: 1.5, fillColor: '#D97706', fillOpacity: 0.2, clickable: false };
  readonly mapOptions: google.maps.MapOptions = { streetViewControl: false, mapTypeControl: true, fullscreenControl: true, clickableIcons: false };

  constructor() {
    this.maps.load().catch(() => undefined);

    pollWhileVisible(() => {
      this.store.refreshPositions();
      if (this.showRoute() && this.store.routeDate() === toDateKey()) this.store.refreshRoute();
    });

    // "x min ago" labels.
    const tick = window.setInterval(() => this.now.set(Date.now()), 30_000);
    this.destroyRef.onDestroy(() => {
      window.clearInterval(tick);
      this.stop();
    });

    effect(() => {
      if (!this.store.loading()) this.lastUpdated.set(new Date());
    });

    // Fit the initial view to the team once positions arrive.
    let fitted = false;
    effect(() => {
      const pts = this.store.positions().filter((p) => p.location).map((p) => p.location!);
      if (!fitted && pts.length) {
        fitted = true;
        this.center.set(centroid(pts, DEFAULT_CENTER));
      }
    });

    // New route → rewind to the end so the full day is visible.
    effect(() => {
      const r = this.route();
      this.stop();
      this.playIndex.set(Math.max(0, (r?.points.length ?? 1) - 1));
    });
  }

  ago(iso: string | null): string {
    if (!iso) return '–';
    const mins = Math.round((this.now() - new Date(iso).getTime()) / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const h = Math.floor(mins / 60);
    return `${h} h ${mins % 60} min ago`;
  }

  select(p: LivePosition | null) {
    this.selectedId.set(p?.employeeId ?? null);
    this.showRoute.set(false);
    this.store.routeEmployeeId.set(null);
    if (p?.location) {
      this.center.set({ ...p.location });
      this.zoom.set(14);
    }
  }

  onMarkerClick(id: string) {
    if (this.selectedId() === id) return this.select(null);
    this.select(this.store.positions().find((x) => x.employeeId === id) ?? null);
  }

  homeDistance(p: LivePosition): string | null {
    const o = this.lookup.officerById().get(p.employeeId);
    return o?.homeLocation && p.location ? formatDistance(distanceMeters(o.homeLocation, p.location)) : null;
  }

  toggleRoute() {
    const id = this.selectedId();
    if (!id) return;
    const next = !this.showRoute();
    this.showRoute.set(next);
    this.store.routeEmployeeId.set(next ? id : null);
  }

  setRouteDate(date: string) {
    if (date) this.store.routeDate.set(date);
  }

  // --- Playback controls ---------------------------------------------------------------------
  play() {
    const n = this.routePath().length;
    if (!n) return;
    if (this.playIndex() >= n - 1) this.playIndex.set(0);
    this.playing.set(true);
    this.timer = window.setInterval(() => {
      const next = this.playIndex() + 1;
      if (next >= this.routePath().length) return this.stop();
      this.playIndex.set(next);
    }, 120);
  }

  stop() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.playing.set(false);
  }

  scrub(value: string) {
    this.stop();
    this.playIndex.set(+value);
  }

  refreshNow() {
    this.store.refreshPositions();
  }

  today() {
    return toDateKey();
  }
}
