import { Component, OnDestroy, computed, effect, inject, input, model, output, signal, untracked } from '@angular/core';
import { GoogleMap, MapAdvancedMarker, MapCircle, MapPolyline } from '@angular/google-maps';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  LucideClipboardCheck,
  LucideDynamicIcon,
  LucideIconData,
  LucideIndianRupee,
  LucideTarget,
  LucideUserRound,
  LucideUsers,
} from '@lucide/angular';
import { GeoPoint, TrackingBranch } from '../../../models/geo';
import { GeoTagKind, GeoTagPoint } from '../../../models/geo-tag';
import { JobTaskPoint, TaskType } from '../../../models/job';
import { MapsLoaderService } from '../../../services/maps-loader.service';
import { PlannedRoute, RoutingService, TRAVEL_MODE_LABEL, formatDuration } from '../../../services/routing.service';
import { DEFAULT_CENTER, distanceMeters, formatCoords } from '../../../utils/geo-utils';
import { LOCATION_NOT_VERIFIED, PICKER_KINDS, PickerKind, needsVerifiedLocation } from '../../../utils/job-rules';
import { DPD_RANGES, DpdRange, dpdRangeOf, inDpdRange } from '../../../utils/dpd';
import { MarkerContentCache, initials } from '../../../utils/marker-content';
import { TASK_TYPE } from '../../../utils/tracking-labels';
import { MapStatus } from '../../shared/map-status/map-status';

export type PlacePickerView = 'list' | 'map';
type DrawMode = 'add' | 'remove';
interface Px {
  x: number;
  y: number;
}
interface Cluster {
  key: string;
  position: GeoPoint;
  members: GeoTagPoint[];
}

const KIND_ORDER: Record<string, number> = { GroupCentre: 0, OdMember: 1, Member: 2 };
const kindOrder = (k: GeoTagKind) => KIND_ORDER[k] ?? 9;

const VIEW_KEY = 'qfin.tracking.placePickerView';
/** Rows rendered in the list at once; "Select all" still covers every match. */
const LIST_LIMIT = 300;
/**
 * Pins that would sit on top of each other are grouped (click a group to zoom in): within 44 px when zoomed out
 * below ZOOMED_OUT (the whole 30 km branch area), within 26 px (= touching pins) closer in, and not at street level.
 */
const ZOOMED_OUT = 12;
const CLUSTER_UNTIL_ZOOM = 17;
const PIN_FREE = '#64748B';
const PIN_BLOCKED = '#CBD5E1';
const HOME_COLOR = '#9333EA';
const TRIP_COLOR = '#2563EB';

export interface KindStyle {
  label: string;
  /** Task type the place becomes by default. */
  becomes: string;
  color: string;
  icon: LucideIconData;
  lucide: string;
}
export const KIND_STYLE: Record<PickerKind, KindStyle> = {
  GroupCentre: { label: 'Groups', becomes: 'Group Visit', color: TASK_TYPE.GroupVisit.color, icon: LucideUsers.icon, lucide: 'users' },
  Member: { label: 'Members', becomes: 'Member Visit', color: TASK_TYPE.MemberVisit.color, icon: LucideUserRound.icon, lucide: 'user-round' },
  OdMember: { label: 'OD members', becomes: 'OD Follow-up', color: TASK_TYPE.OdFollowUp.color, icon: LucideIndianRupee.icon, lucide: 'indian-rupee' },
};
const FIELD_ICON: Record<FieldPointType, LucideIconData> = { LeadSourcing: LucideTarget.icon, Survey: LucideClipboardCheck.icon };

export type FieldPointType = Extract<TaskType, 'LeadSourcing' | 'Survey'>;
/** A point picked on the map for lead sourcing or a survey (no geo-tagged place there). */
export interface FieldPointDraft {
  type: FieldPointType;
  name: string;
  location: GeoPoint;
  radiusMeters: number;
  notes: string | null;
}
/** Field-point tasks already in the list, shown on the map. */
export interface FieldPointMarker {
  key: string;
  type: FieldPointType;
  name: string;
  location: GeoPoint;
  radiusMeters: number;
}
const FIELD_RADIUS: Record<FieldPointType, number> = { LeadSourcing: 500, Survey: 200 };

function readView(): PlacePickerView {
  try {
    return localStorage.getItem(VIEW_KEY) === 'map' ? 'map' : 'list';
  } catch {
    return 'list';
  }
}

/** Web-Mercator world pixel at zoom `z` (Google's tile maths), for grid clustering. */
function worldPx(p: GeoPoint, z: number): Px {
  const size = 256 * 2 ** z;
  const sin = Math.min(Math.max(Math.sin((p.lat * Math.PI) / 180), -0.9999), 0.9999);
  return { x: ((p.lng + 180) / 360) * size, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size };
}

function padBounds(b: google.maps.LatLngBounds, f: number): google.maps.LatLngBounds {
  const ne = b.getNorthEast();
  const sw = b.getSouthWest();
  const dLat = (ne.lat() - sw.lat()) * f;
  const dLng = (ne.lng() - sw.lng()) * f;
  return new google.maps.LatLngBounds({ lat: sw.lat() - dLat, lng: sw.lng() - dLng }, { lat: ne.lat() + dLat, lng: ne.lng() + dLng });
}

/** Ray casting, in screen pixels. */
function insidePolygon(x: number, y: number, poly: Px[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/**
 * Picks the task points of one branch: every geo-tagged group, member and OD member, from a checklist or the map.
 * The task type follows from the place (group → Group Visit, member → Member Visit, OD member → OD Follow-up).
 * Both views share the same selection, filtered by kind (and by days past due for OD).
 *
 * Map: click pins, "Select in view", or draw around an area to add / remove. Large branches are clustered.
 * Clicking empty ground drops a field point for lead sourcing or a survey. "Trip estimate" routes a round trip
 * from the branch through the selection (two-wheeler, best order). The assignee's pending tasks and home are shown for context.
 * Places that cannot take the task (already in the list, or pending in an overlapping job) are shown but locked.
 * Groups, members and OD members whose location is not verified get a "Location Not Verified" badge and are locked too.
 */
@Component({
  selector: 'qfin-place-multi-select',
  imports: [MatCheckboxModule, MatTooltipModule, LucideDynamicIcon, GoogleMap, MapAdvancedMarker, MapCircle, MapPolyline, MapStatus],
  templateUrl: './place-multi-select.html',
})
export class PlaceMultiSelect implements OnDestroy {
  readonly maps = inject(MapsLoaderService);
  private readonly pins = new MarkerContentCache();
  private readonly clusterCache = new Map<string, HTMLElement>();

  /** Geo-tagged groups, members and OD members of the chosen branch. */
  readonly places = input<GeoTagPoint[]>([]);
  /** Place id → why it cannot be selected (from the parent: duplicates, overlapping jobs…). */
  readonly blockedBy = input<Map<string, string>>(new Map(), { alias: 'blocked' });
  readonly loading = input(false);
  /** Per kind: places in the branch that have no geo-tag yet (cannot get a task). */
  readonly untaggedByKind = input<Partial<Record<GeoTagKind, number>>>({});
  readonly branch = input<TrackingBranch | null>(null);
  /** Context: who will do the work, where they live and what they already have pending. */
  readonly assigneeName = input<string | null>(null);
  readonly assigneeHome = input<GeoPoint | null>(null);
  readonly assigneeTasks = input<JobTaskPoint[]>([]);
  /** Lead sourcing / survey points already added, shown on the map. */
  readonly fieldPoints = input<FieldPointMarker[]>([]);
  /** Selected place ids (two-way). */
  readonly selectedIds = model<string[]>([]);
  /** A field point confirmed on the map. */
  readonly addFieldPoint = output<FieldPointDraft>();

  private readonly routing = inject(RoutingService);

  readonly view = signal<PlacePickerView>(readView());
  readonly filter = signal('');
  /** OD members' days-past-due range; null = all. */
  readonly dpdRange = signal<DpdRange | null>(null);
  readonly hiddenKinds = signal<ReadonlySet<PickerKind>>(new Set());
  readonly showAssignee = signal(true);
  /** Map legend; collapsed by default so it never hides pins. */
  readonly showLegend = signal(false);
  readonly note = signal<string | null>(null);
  private noteTimer?: ReturnType<typeof setTimeout>;

  readonly LIST_LIMIT = LIST_LIMIT;
  readonly PIN_FREE = PIN_FREE;
  readonly PIN_BLOCKED = PIN_BLOCKED;
  readonly HOME_COLOR = HOME_COLOR;
  readonly DPD_RANGES = DPD_RANGES;
  readonly LOCATION_NOT_VERIFIED = LOCATION_NOT_VERIFIED;
  readonly TASK_TYPE = TASK_TYPE;
  readonly KIND_STYLE = KIND_STYLE;
  readonly PICKER_KINDS = PICKER_KINDS;
  readonly TRIP_COLOR = TRIP_COLOR;
  readonly TRAVEL_MODE_LABEL = TRAVEL_MODE_LABEL;
  readonly formatDuration = formatDuration;
  readonly formatCoords = formatCoords;
  readonly fieldTypes: FieldPointType[] = ['LeadSourcing', 'Survey'];

  // ---------- Field point (lead sourcing / survey) ----------
  readonly draft = signal<GeoPoint | null>(null);
  readonly draftType = signal<FieldPointType>('LeadSourcing');
  readonly draftName = signal('');
  readonly draftRadius = signal(FIELD_RADIUS.LeadSourcing);
  readonly draftNotes = signal('');
  readonly draftError = signal<string | null>(null);
  readonly fieldHint = signal(false);
  private radiusTouched = false;
  private markerClickedAt = 0;
  readonly draftContent = computed(() => this.pins.iconPin('__draft', FIELD_ICON[this.draftType()], TASK_TYPE[this.draftType()].color, { selected: true }));
  readonly draftCircle = computed<google.maps.CircleOptions>(() => {
    const c = TASK_TYPE[this.draftType()].color;
    return { strokeColor: c, strokeWeight: 1.5, fillColor: c, fillOpacity: 0.12, clickable: false };
  });
  /** Distance of the draft from the branch, when beyond its operating radius. */
  readonly draftOutside = computed(() => {
    const d = this.draft();
    const b = this.branch();
    if (!d || !b?.location) return null;
    const km = distanceMeters(d, b.location) / 1000;
    return km > b.operatingRadiusKm ? { km, limit: b.operatingRadiusKm } : null;
  });
  readonly fieldMarkers = computed(() =>
    this.fieldPoints().map((f) => ({
      ...f,
      title: `${TASK_TYPE[f.type].label} · ${f.name} (in the list)`,
      content: this.pins.iconPin(`fp:${f.key}`, FIELD_ICON[f.type], TASK_TYPE[f.type].color, {}),
      circle: { strokeColor: TASK_TYPE[f.type].color, strokeWeight: 1, fillColor: TASK_TYPE[f.type].color, fillOpacity: 0.08, clickable: false } as google.maps.CircleOptions,
    })),
  );

  // ---------- Trip estimate ----------
  readonly trip = signal<{ ids: string[]; route: PlannedRoute } | null>(null);
  readonly tripLoading = signal(false);
  readonly tripError = signal<string | null>(null);
  /** The estimate only counts while the selection is unchanged. */
  readonly tripValid = computed(() => {
    const t = this.trip();
    if (!t) return null;
    const sel = this.selectedIds();
    return sel.length === t.ids.length && sel.every((id) => t.ids.includes(id)) ? t : null;
  });
  /** Place id → visiting order (1-based) in the trip estimate. */
  readonly tripSeq = computed(() => {
    const t = this.tripValid();
    const map = new Map<string, number>();
    t?.route.order.forEach((stopIndex, i) => map.set(t.ids[stopIndex], i + 1));
    return map;
  });
  readonly tripLine = computed<google.maps.PolylineOptions>(() => ({ strokeColor: TRIP_COLOR, strokeOpacity: 0.85, strokeWeight: 5, clickable: false }));

  readonly gmap = signal<google.maps.Map | null>(null);
  private overlay: google.maps.OverlayView | null = null;
  private readonly bounds = signal<google.maps.LatLngBounds | null>(null);
  private readonly zoom = signal(13);

  readonly drawMode = signal<DrawMode | null>(null);
  readonly drawPath = signal<Px[]>([]);
  private drawing = false;
  readonly drawPoints = computed(() => this.drawPath().map((p) => `${p.x},${p.y}`).join(' '));

  readonly mapOptions: google.maps.MapOptions = {
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
    clickableIcons: false,
    gestureHandling: 'greedy',
  };

  readonly center = computed(() => this.branch()?.location ?? DEFAULT_CENTER);
  readonly branchContent = this.pins.badge('__branch', 'BR', '#0F172A');
  /** The branch's operating radius (default 30 km): work beyond it needs an out-of-radius approval. */
  readonly branchRadiusMeters = computed(() => (this.branch()?.operatingRadiusKm ?? 0) * 1000);
  readonly branchRadiusOptions: google.maps.CircleOptions = {
    strokeColor: '#0F172A',
    strokeOpacity: 0.55,
    strokeWeight: 1.5,
    fillColor: '#0F172A',
    fillOpacity: 0.03,
    clickable: false,
  };

  // ---------- Selection & filters ----------

  readonly selectedSet = computed(() => new Set(this.selectedIds()));
  /**
   * Place id → why it cannot be selected: the parent's reasons, plus groups / members / OD members whose location
   * is not verified (enforced here too, so no caller can offer them).
   */
  readonly blocked = computed(() => {
    const map = new Map(this.blockedBy());
    this.places().forEach((p) => {
      if (this.isUnverified(p)) map.set(p.id, LOCATION_NOT_VERIFIED);
    });
    return map;
  });
  readonly kindCounts = computed(() => {
    const counts: Record<PickerKind, number> = { GroupCentre: 0, Member: 0, OdMember: 0 };
    this.places().forEach((p) => {
      if (p.kind in counts) counts[p.kind as PickerKind]++;
    });
    return counts;
  });
  readonly untaggedTotal = computed(() => PICKER_KINDS.reduce((s, k) => s + (this.untaggedByKind()[k] ?? 0), 0));
  readonly untaggedText = computed(() =>
    PICKER_KINDS.filter((k) => this.untaggedByKind()[k])
      .map((k) => `${this.untaggedByKind()[k]} ${KIND_STYLE[k].label.toLowerCase()}`)
      .join(', '),
  );
  /** OD members are shown, so the days-past-due filter applies. */
  readonly hasDpd = computed(() => !this.hiddenKinds().has('OdMember') && this.kindCounts().OdMember > 0);
  /** Places after the kind and DPD filters: what the list, the map and the bulk actions work on. */
  readonly visible = computed(() => {
    const hidden = this.hiddenKinds();
    const range = this.dpdRange();
    return this.places().filter((p) => !hidden.has(p.kind as PickerKind) && (p.kind !== 'OdMember' || inDpdRange(p.dpd, range)));
  });
  readonly available = computed(() => this.visible().filter((p) => !this.blocked().has(p.id)));
  /** Shown places whose location is not verified (counted apart from the other unavailable places). */
  readonly unverifiedVisible = computed(() => this.visible().filter((p) => this.isUnverified(p)).length);
  readonly blockedVisible = computed(() => this.visible().length - this.available().length - this.unverifiedVisible());
  /** Selected places hidden by the filters (still selected). */
  readonly hiddenSelected = computed(() => {
    const vis = new Set(this.visible().map((p) => p.id));
    return this.selectedIds().filter((id) => !vis.has(id)).length;
  });

  private readonly ordered = computed(() =>
    [...this.visible()].sort((a, b) => kindOrder(a.kind) - kindOrder(b.kind) || (b.dpd ?? 0) - (a.dpd ?? 0) || a.name.localeCompare(b.name)),
  );
  readonly filtered = computed(() => {
    const q = this.filter().trim().toLowerCase();
    if (!q) return this.ordered();
    return this.ordered().filter(
      (p) => p.name.toLowerCase().includes(q) || p.refCode.toLowerCase().includes(q) || (p.address ?? '').toLowerCase().includes(q),
    );
  });
  readonly shown = computed(() => this.filtered().slice(0, LIST_LIMIT));
  readonly filteredAvailable = computed(() => this.filtered().filter((p) => !this.blocked().has(p.id)));
  readonly allFilteredSelected = computed(() => {
    const list = this.filteredAvailable();
    const sel = this.selectedSet();
    return list.length > 0 && list.every((p) => sel.has(p.id));
  });
  readonly someFilteredSelected = computed(() => !this.allFilteredSelected() && this.filteredAvailable().some((p) => this.selectedSet().has(p.id)));

  /** Available, not yet selected places inside the current map view. */
  readonly inViewIds = computed(() => {
    const b = this.bounds();
    if (!b) return [];
    const sel = this.selectedSet();
    return this.available()
      .filter((p) => !sel.has(p.id) && b.contains(p.location))
      .map((p) => p.id);
  });

  // ---------- Map markers ----------

  /** Places near the view, grouped into clusters when the branch is large and the map is zoomed out. */
  private readonly mapItems = computed(() => {
    const pts = this.visible();
    const b = this.bounds();
    const z = this.zoom();
    const near = b ? padBounds(b, 0.25) : null;
    const inView = near ? pts.filter((p) => near.contains(p.location)) : pts;
    if (z >= CLUSTER_UNTIL_ZOOM) return { singles: inView, clusters: [] as Cluster[] };
    // Greedy grouping by on-screen distance: any pin closer than `radius` px to a group's first pin joins it.
    const radius = z < ZOOMED_OUT ? 44 : 26;
    const px = inView.map((p) => worldPx(p.location, z));
    const grid = new Map<string, number[]>();
    px.forEach((w, i) => {
      const key = `${Math.floor(w.x / radius)}:${Math.floor(w.y / radius)}`;
      const cell = grid.get(key);
      if (cell) cell.push(i);
      else grid.set(key, [i]);
    });
    const taken = new Uint8Array(inView.length);
    const singles: GeoTagPoint[] = [];
    const clusters: Cluster[] = [];
    inView.forEach((p, i) => {
      if (taken[i]) return;
      taken[i] = 1;
      const members = [p];
      const cx = Math.floor(px[i].x / radius);
      const cy = Math.floor(px[i].y / radius);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (const j of grid.get(`${cx + dx}:${cy + dy}`) ?? []) {
            if (taken[j] || Math.hypot(px[j].x - px[i].x, px[j].y - px[i].y) >= radius) continue;
            taken[j] = 1;
            members.push(inView[j]);
          }
        }
      }
      if (members.length === 1) singles.push(p);
      // Drawn on the seed pin (not the centroid): seeds are at least `radius` apart, so badges and pins never overlap.
      else clusters.push({ key: `${p.id}:${members.length}`, members, position: p.location });
    });
    return { singles, clusters };
  });

  readonly markers = computed(() => {
    const sel = this.selectedSet();
    const blocked = this.blocked();
    const seq = this.tripSeq();
    return this.mapItems().singles.map((p) => {
      const style = KIND_STYLE[p.kind as PickerKind] ?? KIND_STYLE.GroupCentre;
      const why = blocked.get(p.id) ?? null;
      const on = sel.has(p.id);
      const color = p.dpd != null ? dpdRangeOf(p.dpd).color : style.color;
      const n = seq.get(p.id);
      const content = why
        ? this.pins.iconPin(p.id, style.icon, PIN_BLOCKED, { small: true })
        : on
          ? this.pins.iconPin(p.id, style.icon, color, { selected: true, label: n ? String(n) : null })
          : this.pins.iconPin(p.id, style.icon, color, { small: true, outline: true });
      const extra = p.dpd != null ? ` · ${p.dpd} DPD · ₹${this.money(p.overdueAmount)}` : '';
      const state = why ? ` · ${why}` : on ? `${n ? ` · stop ${n}` : ''} · selected (click to remove)` : ' · click to select';
      return { id: p.id, position: p.location, title: `${style.becomes}: ${p.name} · ${p.refCode}${extra}${state}`, content, z: on ? 300 : why ? 50 : 100 };
    });
  });

  readonly clusterMarkers = computed(() => {
    const sel = this.selectedSet();
    const blocked = this.blocked();
    const color = '#16C784';
    return this.mapItems().clusters.map((c) => {
      const open = c.members.filter((p) => !blocked.has(p.id));
      const chosen = open.filter((p) => sel.has(p.id)).length;
      const od = c.members.filter((p) => p.dpd != null);
      const worst = od.length ? Math.max(...od.map((p) => p.dpd ?? 0)) : null;
      const base = PIN_FREE;
      const content = this.clusterEl(c.key, c.members.length, open.length ? chosen / open.length : 0, base, color);
      const title = `${c.members.length} places · ${chosen} selected${worst != null ? ` · OD up to ${worst} DPD` : ''} · click to zoom in`;
      return { key: c.key, position: c.position, title, content, cluster: c };
    });
  });

  readonly assigneeMarkers = computed(() =>
    this.showAssignee()
      ? this.assigneeTasks().map((t) => ({
          id: t.taskId,
          position: t.location,
          title: `${this.assigneeName() ?? 'Assignee'}: ${t.taskNo} · ${t.title} · ${t.jobNo} (due ${t.jobCompleteBy})`,
          content: this.pins.dot(`a:${t.taskId}`, TASK_TYPE[t.type].color, 12),
        }))
      : [],
  );
  readonly homeMarker = computed(() => {
    const home = this.assigneeHome();
    if (!home || !this.showAssignee()) return null;
    return { position: home, content: this.pins.badge('__home', initials(this.assigneeName()), HOME_COLOR), title: `${this.assigneeName() ?? 'Assignee'}'s home` };
  });

  constructor() {
    this.maps.load().catch(() => undefined);
    // Frame the places whenever the map opens or the list of places changes (branch / kind switched).
    effect(() => {
      const map = this.gmap();
      const places = this.places();
      if (map) untracked(() => this.fit(map, places));
    });
  }

  ngOnDestroy() {
    clearTimeout(this.noteTimer);
    this.overlay?.setMap(null);
  }

  setView(view: PlacePickerView) {
    this.view.set(view);
    if (view === 'list') {
      this.cancelDraw();
      this.cancelDraft();
      this.fieldHint.set(false);
      this.overlay?.setMap(null);
      this.overlay = null;
      this.gmap.set(null);
      this.bounds.set(null);
    }
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {
      /* storage blocked: keep the choice for this session only */
    }
  }

  isSelected(id: string) {
    return this.selectedSet().has(id);
  }

  dpdColor(dpd: number) {
    return dpdRangeOf(dpd).color;
  }

  /** A group, member or OD member whose location is not verified yet: badge, and not selectable. */
  isUnverified(p: GeoTagPoint) {
    return needsVerifiedLocation(p.kind) && !p.verified;
  }

  money(n: number | null) {
    return (n ?? 0).toLocaleString('en-IN');
  }

  toggleKind(kind: PickerKind) {
    this.hiddenKinds.update((set) => {
      const next = new Set(set);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

  kindStyle(kind: GeoTagKind): KindStyle {
    return KIND_STYLE[kind as PickerKind] ?? KIND_STYLE.GroupCentre;
  }

  /** Pin click on the map (also stops the same click from dropping a field point). */
  onPinClick(id: string | null) {
    this.markerClickedAt = Date.now();
    if (id) this.toggle(id);
  }

  toggle(id: string) {
    if (this.blocked().has(id)) return;
    this.selectedIds.update((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  toggleAllFiltered(checked: boolean) {
    const ids = this.filteredAvailable().map((p) => p.id);
    if (checked) this.addIds(ids);
    else this.removeIds(ids);
  }

  selectInView() {
    const ids = this.inViewIds();
    this.addIds(ids);
    this.flash(`${ids.length} added from the map view.`);
  }

  clear() {
    this.selectedIds.set([]);
  }

  // ---------- Map events ----------

  onMapInitialized(map: google.maps.Map) {
    // An empty overlay gives access to the map projection (screen pixel ↔ lat/lng) for area drawing.
    const ov = new google.maps.OverlayView();
    ov.onAdd = () => undefined;
    ov.draw = () => undefined;
    ov.onRemove = () => undefined;
    ov.setMap(map);
    this.overlay = ov;
    this.gmap.set(map);
  }

  onMapIdle() {
    const map = this.gmap();
    if (!map) return;
    const z = map.getZoom() ?? 13;
    if (z !== this.zoom()) this.clusterCache.clear();
    this.zoom.set(z);
    this.bounds.set(map.getBounds() ?? null);
  }

  onMapClick(e: google.maps.MapMouseEvent) {
    const at = e.latLng ? { lat: +e.latLng.lat().toFixed(6), lng: +e.latLng.lng().toFixed(6) } : null;
    if (!at || this.drawMode()) return;
    // Let a marker click on the same tap win (the two events can arrive in either order).
    setTimeout(() => {
      if (Date.now() - this.markerClickedAt < 400) return;
      this.openDraft(at);
    });
  }

  zoomInto(c: Cluster) {
    this.markerClickedAt = Date.now();
    const map = this.gmap();
    if (!map) return;
    const b = new google.maps.LatLngBounds();
    c.members.forEach((p) => b.extend(p.location));
    const ne = b.getNorthEast();
    const sw = b.getSouthWest();
    if (ne.equals(sw)) {
      map.setCenter(c.position);
      map.setZoom((map.getZoom() ?? 13) + 2);
    } else map.fitBounds(b, 60);
  }

  refit() {
    const map = this.gmap();
    if (map) this.fit(map, this.visible());
  }

  // ---------- Field point ----------

  /** "Field point" button: switch to the map and explain. */
  startFieldPoint() {
    if (this.view() !== 'map') this.setView('map');
    this.fieldHint.set(true);
  }

  private openDraft(at: GeoPoint) {
    this.fieldHint.set(false);
    if (!this.draft()) {
      this.draftName.set('');
      this.draftNotes.set('');
      this.radiusTouched = false;
      this.draftRadius.set(FIELD_RADIUS[this.draftType()]);
    }
    this.draftError.set(null);
    this.draft.set(at);
  }

  setDraftType(type: FieldPointType) {
    this.draftType.set(type);
    if (!this.radiusTouched) this.draftRadius.set(FIELD_RADIUS[type]);
  }

  setDraftRadius(value: string) {
    this.radiusTouched = true;
    this.draftRadius.set(Math.max(10, Math.round(+value || 0)));
  }

  onDraftDrag(e: google.maps.MapMouseEvent) {
    if (e.latLng) this.draft.set({ lat: +e.latLng.lat().toFixed(6), lng: +e.latLng.lng().toFixed(6) });
  }

  cancelDraft() {
    this.draft.set(null);
    this.draftError.set(null);
  }

  confirmDraft() {
    const at = this.draft();
    const name = this.draftName().trim();
    if (!at) return;
    if (name.length < 3) {
      this.draftError.set('Give the place a name, e.g. "Jateswar market".');
      return;
    }
    this.addFieldPoint.emit({ type: this.draftType(), name, location: at, radiusMeters: this.draftRadius(), notes: this.draftNotes().trim() || null });
    this.flash(`${TASK_TYPE[this.draftType()].label} at ${name} added to the list.`);
    this.cancelDraft();
  }

  // ---------- Trip estimate ----------

  async estimateTrip() {
    const origin = this.branch()?.location;
    const byId = new Map(this.places().map((p) => [p.id, p]));
    const ids = this.selectedIds().filter((id) => byId.has(id));
    if (!origin || !ids.length) return;
    this.tripLoading.set(true);
    this.tripError.set(null);
    try {
      const route = await this.routing.plan(origin, ids.map((id) => byId.get(id)!.location), { destination: origin, optimize: true });
      this.trip.set({ ids, route });
    } catch (err) {
      this.trip.set(null);
      this.tripError.set(err instanceof Error ? err.message : 'Route could not be calculated.');
    } finally {
      this.tripLoading.set(false);
    }
  }

  clearTrip() {
    this.trip.set(null);
    this.tripError.set(null);
  }

  // ---------- Area drawing ----------

  startDraw(mode: DrawMode) {
    if (!this.gmap()) return;
    this.cancelDraft();
    this.fieldHint.set(false);
    this.drawMode.set(mode);
    this.drawPath.set([]);
    this.note.set(null);
  }

  cancelDraw() {
    this.drawing = false;
    this.drawMode.set(null);
    this.drawPath.set([]);
  }

  onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    this.drawing = true;
    this.drawPath.set([this.px(e)]);
    e.preventDefault();
  }

  onPointerMove(e: PointerEvent) {
    if (!this.drawing) return;
    const p = this.px(e);
    const path = this.drawPath();
    const last = path[path.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) >= 4) this.drawPath.set([...path, p]);
  }

  onPointerUp() {
    if (!this.drawing) return;
    this.drawing = false;
    const path = this.drawPath();
    const mode = this.drawMode();
    const proj = this.overlay?.getProjection();
    this.cancelDraw();
    if (!mode || !proj || path.length < 3) return;

    const inside = this.visible().filter((p) => {
      const pt = proj.fromLatLngToContainerPixel(new google.maps.LatLng(p.location.lat, p.location.lng));
      return !!pt && insidePolygon(pt.x, pt.y, path);
    });
    if (mode === 'add') {
      const sel = this.selectedSet();
      const blocked = this.blocked();
      const fresh = inside.filter((p) => !blocked.has(p.id) && !sel.has(p.id)).map((p) => p.id);
      const locked = inside.filter((p) => blocked.has(p.id)).length;
      this.addIds(fresh);
      this.flash(`${fresh.length} added from the area${locked ? ` · ${locked} unavailable skipped` : ''}.`);
    } else {
      const sel = this.selectedSet();
      const ids = inside.filter((p) => sel.has(p.id)).map((p) => p.id);
      this.removeIds(ids);
      this.flash(`${ids.length} removed from the selection.`);
    }
  }

  private px(e: PointerEvent): Px {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  // ---------- Helpers ----------

  private addIds(ids: string[]) {
    if (!ids.length) return;
    this.selectedIds.update((list) => {
      const have = new Set(list);
      return [...list, ...ids.filter((x) => !have.has(x))];
    });
  }

  private removeIds(ids: string[]) {
    if (!ids.length) return;
    const drop = new Set(ids);
    this.selectedIds.update((list) => list.filter((x) => !drop.has(x)));
  }

  flash(text: string) {
    clearTimeout(this.noteTimer);
    this.note.set(text);
    this.noteTimer = setTimeout(() => this.note.set(null), 4000);
  }

  /** Round cluster badge; the coloured share of the ring is the selected share of its available places. */
  private clusterEl(key: string, count: number, selectedShare: number, base: string, selected: string): HTMLElement {
    let el = this.clusterCache.get(key);
    if (!el) {
      el = document.createElement('div');
      el.className = 'trk-marker-cluster';
      el.appendChild(document.createElement('span'));
      this.clusterCache.set(key, el);
    }
    const size = count < 10 ? 34 : count < 50 ? 40 : count < 200 ? 46 : 54;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.setProperty('--trk-color', base);
    el.style.setProperty('--trk-sel', selected);
    el.style.setProperty('--sel', selectedShare.toFixed(3));
    (el.firstChild as HTMLElement).textContent = String(count);
    return el;
  }

  /** Frames the whole branch area (operating radius) and every place, even one outside it. */
  private fit(map: google.maps.Map, places: GeoTagPoint[]) {
    const bounds = new google.maps.LatLngBounds();
    places.forEach((p) => bounds.extend(p.location));
    const b = this.branch()?.location;
    const r = this.branchRadiusMeters();
    if (b && r) {
      const circle = new google.maps.Circle({ center: b, radius: r }).getBounds();
      if (circle) bounds.union(circle);
    } else if (b) bounds.extend(b);
    if (bounds.isEmpty()) return;
    const ne = bounds.getNorthEast();
    if (ne.equals(bounds.getSouthWest())) {
      map.setCenter(ne);
      map.setZoom(15);
    } else map.fitBounds(bounds, 0);
  }
}
