import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { GoogleMap, MapAdvancedMarker, MapCircle, MapPolyline } from '@angular/google-maps';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { EmployeeRoute, LivePosition, LiveStatus } from '../../models/live-position';
import { MapsLoaderService } from '../../services/maps-loader.service';
import { LiveTrackingStore } from '../../stores/live-tracking-store';
import { TrackingLookupStore } from '../../stores/tracking-lookup-store';
import { TrackingSettingsStore } from '../../stores/tracking-settings-store';
import { DEFAULT_CENTER, centroid, distanceMeters, formatDistance, toDateKey } from '../../utils/geo-utils';
import { MarkerContentCache, initials } from '../../utils/marker-content';
import { TRACKING_POLL_MS, pollWhileVisible } from '../../utils/poll';
import { LIVE_STATUS, roleLabel, STOP_KIND } from '../../utils/tracking-labels';
import { MapStatus } from '../../components/shared/map-status/map-status';
import { TrackingChip } from '../../components/shared/tracking-chip/tracking-chip';
import { TrkDateField } from '../../components/shared/date-field/trk-date-field';
import { LiveBadge } from '../../components/shared/live-badge/live-badge';
import { MotionSegment } from '../../utils/live-message';
import { GeoPoint } from '../../models/geo';
import { LucideClipboardCheck, LucideIconData, LucideSatellite, LucideTimer } from '@lucide/angular';

type StatusFilter = LiveStatus | 'All';

/** A marker glides to a new position over this long instead of jumping. */
const GLIDE_MS = 1500;
/** Farther than this (a GPS gap, a first fix far away) the marker jumps: gliding would draw a path nobody travelled. */
const GLIDE_MAX_METERS = 5000;

/** Arrow drawn along a path, pointing the way it was travelled (SVG path, so no `google` namespace is needed before the map loads). */
const DIRECTION_ARROW = (color: string): google.maps.IconSequence => ({
  icon: { path: 'M 0,-2 L 1.6,1.6 L 0,0.7 L -1.6,1.6 Z', scale: 3, fillColor: '#FFFFFF', fillOpacity: 1, strokeColor: color, strokeWeight: 1.2 },
  offset: '40px',
  repeat: '90px',
});

interface Glide {
  from: GeoPoint;
  to: GeoPoint;
  start: number;
}

const samePoint = (a: GeoPoint, b: GeoPoint) => a.lat === b.lat && a.lng === b.lng;

/** Icon of a plotted motion period. */
const MOTION_ICON: Partial<Record<LiveStatus, LucideIconData>> = {
  Idle: LucideTimer.icon,
  OnTask: LucideClipboardCheck.icon,
  Offline: LucideSatellite.icon,
};

@Component({
  selector: 'qfin-live-map',
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    MatTooltipModule,
    LucideDynamicIcon,
    GoogleMap,
    MapAdvancedMarker,
    MapCircle,
    MapPolyline,
    MapStatus,
    TrackingChip,
    TrkDateField,
    LiveBadge,
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
  readonly roleLabel = roleLabel;
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
      // Open alerts first, then by name. Not by "has a position": clicking someone loads their trail, which gives them a
      // position and made the clicked row jump to the top of the list.
      .sort((a, b) => b.openAlertCount - a.openAlertCount || a.employeeName.localeCompare(b.employeeName));
  });

  readonly selected = computed(() => this.store.positions().find((p) => p.employeeId === this.selectedId()) ?? null);
  readonly selectedOfficer = computed(() => (this.selectedId() ? this.lookup.officerById().get(this.selectedId()!) : undefined));

  /** The map follows the selected person's new positions; dragging the map stops it, the Follow button resumes it. */
  readonly follow = signal(true);
  private readonly map = viewChild(GoogleMap);

  /** Marker positions as drawn: each glides to its person's new position (see `glideTo`). */
  readonly shownPositions = signal<ReadonlyMap<string, GeoPoint>>(new Map());
  private readonly glides = new Map<string, Glide>();
  private frame: number | null = null;

  // --- Map layers ---------------------------------------------------------------------------
  readonly center = signal(DEFAULT_CENTER);
  readonly zoom = signal(9);

  readonly personMarkers = computed(() =>
    this.people()
      .filter((p) => !!p.location)
      .map((p) => ({
        id: p.employeeId,
        position: this.shownPositions().get(p.employeeId) ?? p.location!,
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
    return o?.presentLocation ? { position: o.presentLocation, content: this.markers.pin('home', '⌂', '#D97706', { small: true }) } : null;
  });

  // --- Today's trail of the selected person (GPS service history + live fixes) ----------------------------------
  /** Hidden while "Show route" is on (the day route has its own line). */
  readonly trailPath = computed(() => {
    if (this.showRoute()) return [];
    const path = this.store.trail().map((f) => f.location);
    // While the marker glides to the newest fix, the line grows with it instead of reaching the fix first.
    const id = this.selectedId();
    const shown = id ? this.shownPositions().get(id) : undefined;
    const last = path.at(-1);
    if (shown && last && this.glides.has(id!) && samePoint(this.glides.get(id!)!.to, last)) path[path.length - 1] = shown;
    return path;
  });
  readonly trailStart = computed(() => {
    const first = this.trailPath()[0];
    return first ? { position: first, content: this.markers.dot('trail-start', '#16A34A', 10) } : null;
  });
  /** Today's STOPPED / ON_TASK / OFFLINE periods of the selected person (`GET /api/v1/motion` + `/motion` topic). */
  readonly motionMarkers = computed(() =>
    this.showRoute()
      ? []
      : this.store.motionPoints().map((m) => ({
          key: `${m.from}|${m.status}`,
          position: m.location,
          title: `${LIVE_STATUS[m.status].label} · ${this.time(m.from)} – ${m.to ? this.time(m.to) : 'now'} (${this.hm(this.motionMinutes(m))})`,
          content: this.markers.iconPin(`mo-${m.from}-${m.status}`, MOTION_ICON[m.status] ?? LucideTimer.icon, LIVE_STATUS[m.status].color, {
            small: true,
            selected: !m.to,
          }),
        })),
  );
  readonly trailLine: google.maps.PolylineOptions = {
    strokeColor: '#0EA5E9',
    strokeOpacity: 0.9,
    strokeWeight: 5,
    clickable: false,
    icons: [DIRECTION_ARROW('#0369A1')],
  };
  /** Move the map to the trail's last point once it loads (the person had no position when clicked). */
  private centerOnTrail = false;

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
  readonly playedLine: google.maps.PolylineOptions = {
    strokeColor: '#2563EB',
    strokeOpacity: 0.95,
    strokeWeight: 5,
    clickable: false,
    icons: [DIRECTION_ARROW('#1E40AF')],
  };
  readonly branchCircle: google.maps.CircleOptions = { strokeColor: '#0F172A', strokeOpacity: 0.35, strokeWeight: 1, fillColor: '#0F172A', fillOpacity: 0.03, clickable: false };
  readonly homeCircle: google.maps.CircleOptions = { strokeColor: '#D97706', strokeWeight: 1.5, fillColor: '#D97706', fillOpacity: 0.2, clickable: false };
  readonly mapOptions: google.maps.MapOptions = { streetViewControl: false, mapTypeControl: true, fullscreenControl: true, clickableIcons: false };

  constructor() {
    this.maps.load().catch(() => undefined);

    // Team roster (active-users) and the selected person's GPS / motion pushed as they happen; the 30 s poll below stays on.
    this.store.followLive();

    pollWhileVisible(() => {
      this.store.refreshPositions();
      // No live connection for the selected person (refused or down): refresh their trail and motion points by polling.
      if (this.store.trailEmployeeId() && !this.store.personLive()) this.store.reloadTrail();
      if (this.showRoute() && this.store.routeDate() === toDateKey()) this.store.refreshRoute();
    });

    // "x min ago" labels.
    const tick = window.setInterval(() => this.now.set(Date.now()), 30_000);
    this.destroyRef.onDestroy(() => {
      window.clearInterval(tick);
      if (this.frame !== null) cancelAnimationFrame(this.frame);
      this.stop();
      this.store.trailEmployeeId.set(null);
    });

    effect(() => {
      const last = this.store.trail().at(-1);
      if (!last || !this.centerOnTrail) return;
      this.centerOnTrail = false;
      this.center.set({ ...last.location });
      this.zoom.set(14);
    });

    effect(() => {
      if (!this.store.loading()) this.lastUpdated.set(new Date());
    });

    // Markers glide to each new position (live fix, roster, poll) instead of jumping.
    effect(() => {
      const targets = new Map(this.store.positions().filter((p) => !!p.location).map((p) => [p.employeeId, p.location!] as const));
      untracked(() => this.glideTo(targets));
    });

    // Follow the selected person: pan to each new position while following.
    let followed = '';
    effect(() => {
      const p = this.selected();
      const to = p?.location;
      if (!p || !to || !this.follow()) return;
      const key = `${p.employeeId}|${to.lat},${to.lng}`;
      if (key === followed) return;
      followed = key;
      untracked(() => this.map()?.panTo(to));
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

    // New route → rewind to the end so the full day is visible. The same route growing (live fix, today's poll) only
    // follows the end when the user is not playing or scrubbing back.
    let shown: EmployeeRoute | undefined;
    effect(() => {
      const r = this.route();
      const n = r?.points.length ?? 0;
      const before = shown?.points.length ?? 0;
      const grew = !!r && !!shown && r.employeeId === shown.employeeId && r.date === shown.date && n >= before;
      untracked(() => {
        if (!grew) {
          this.stop();
          this.playIndex.set(Math.max(0, n - 1));
        } else if (!this.playing() && this.playIndex() >= before - 1) {
          this.playIndex.set(Math.max(0, n - 1));
        }
      });
      shown = r;
    });
  }

  /** Length of a motion period in minutes (an open one runs until now). */
  motionMinutes(m: MotionSegment): number {
    return Math.max(0, Math.round(((m.to ? Date.parse(m.to) : Date.now()) - Date.parse(m.from)) / 60_000));
  }

  private time(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  /** 95 → "1 h 35 m", 20 → "20 m". */
  hm(mins: number): string {
    const h = Math.floor(mins / 60);
    return h ? `${h} h ${mins % 60} m` : `${mins} m`;
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
    this.follow.set(true);
    this.showRoute.set(false);
    this.store.routeEmployeeId.set(null);
    // Today's trail up to now from the GPS service; from then on it grows from the live socket.
    this.store.trailEmployeeId.set(p?.employeeId ?? null);
    this.centerOnTrail = !!p && !p.location;
    if (p?.location) {
      this.center.set({ ...p.location });
      this.zoom.set(14);
    }
  }

  /** Branch filter: narrows the list and the markers, and moves the map to that branch. */
  setBranch(branchId: string | null) {
    this.store.branchId.set(branchId);
    if (this.selectedId() && !this.store.positions().some((p) => p.employeeId === this.selectedId())) this.select(null);
    const branch = branchId ? this.lookup.branchById().get(branchId) : null;
    if (branch?.location) {
      this.center.set({ ...branch.location });
      this.zoom.set(11);
    } else if (!branchId) {
      const pts = this.store.positions().filter((p) => p.location).map((p) => p.location!);
      if (pts.length) this.center.set(centroid(pts, DEFAULT_CENTER));
      this.zoom.set(9);
    }
  }

  onMarkerClick(id: string) {
    if (this.selectedId() === id) return this.select(null);
    this.select(this.store.positions().find((x) => x.employeeId === id) ?? null);
  }

  /** The user moved the map: stop following the selected person until Follow is pressed. */
  onMapDrag() {
    if (this.selectedId()) this.follow.set(false);
  }

  /** Follow the selected person again and move the map to them now. */
  resumeFollow() {
    this.follow.set(true);
    const to = this.selected()?.location;
    if (to) this.map()?.panTo(to);
  }

  /**
   * Starts a glide for each marker whose position changed: from where it is drawn now (mid-glide included) to the new
   * position, eased over `GLIDE_MS`. New markers and jumps longer than `GLIDE_MAX_METERS` are placed at once.
   */
  private glideTo(targets: ReadonlyMap<string, GeoPoint>) {
    const shown = this.shownPositions();
    const next = new Map(shown);
    let changed = false;
    for (const id of shown.keys()) {
      if (!targets.has(id)) {
        next.delete(id);
        this.glides.delete(id);
        changed = true;
      }
    }
    const now = performance.now();
    for (const [id, to] of targets) {
      const glide = this.glides.get(id);
      if (glide && samePoint(glide.to, to)) continue;
      const from = shown.get(id);
      if (from && samePoint(from, to)) continue;
      if (!from || distanceMeters(from, to) > GLIDE_MAX_METERS) {
        this.glides.delete(id);
        next.set(id, to);
        changed = true;
        continue;
      }
      this.glides.set(id, { from, to, start: now });
    }
    if (changed) this.shownPositions.set(next);
    this.nextFrame();
  }

  private nextFrame() {
    if (this.frame === null && this.glides.size) this.frame = requestAnimationFrame((t) => this.step(t));
  }

  /** One animation frame: moves every gliding marker along its line (ease in-out). */
  private step(t: number) {
    this.frame = null;
    const next = new Map(this.shownPositions());
    for (const [id, g] of this.glides) {
      const k = Math.min(1, Math.max(0, (t - g.start) / GLIDE_MS));
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      next.set(id, { lat: g.from.lat + (g.to.lat - g.from.lat) * e, lng: g.from.lng + (g.to.lng - g.from.lng) * e });
      if (k >= 1) this.glides.delete(id);
    }
    this.shownPositions.set(next);
    this.nextFrame();
  }

  homeDistance(p: LivePosition): string | null {
    const o = this.lookup.officerById().get(p.employeeId);
    return o?.presentLocation && p.location ? formatDistance(distanceMeters(o.presentLocation, p.location)) : null;
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
