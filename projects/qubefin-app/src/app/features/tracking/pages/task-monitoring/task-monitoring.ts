import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { GoogleMap, MapAdvancedMarker, MapCircle, MapPolyline } from '@angular/google-maps';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { ApiPaths } from 'qubefin-core';
import { TaskSearchResponse, TaskStatus, TrackingTask } from '../../models/tracking-task';
import { MapsLoaderService } from '../../services/maps-loader.service';
import { TrackingLookupStore } from '../../stores/tracking-lookup-store';
import { DEFAULT_CENTER, formatDistance, toDateKey } from '../../utils/geo-utils';
import { MarkerContentCache } from '../../utils/marker-content';
import { pollWhileVisible } from '../../utils/poll';
import { ROLE_LABEL, TASK_STATUS, TASK_TYPE, optionsOf } from '../../utils/tracking-labels';
import { MapStatus } from '../../components/shared/map-status/map-status';
import { TrackingChip } from '../../components/shared/tracking-chip/tracking-chip';
import { TaskEvidence } from '../../components/tasks/task-evidence/task-evidence';
import { TaskTimeline } from '../../components/tasks/task-timeline/task-timeline';

const STEP_ORDER: Record<TaskStatus, number> = { Assigned: 1, Arrived: 2, InProgress: 3, Completed: 4, Missed: 0, Cancelled: 0 };

@Component({
  selector: 'qfin-task-monitoring',
  imports: [
    DatePipe,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    LucideDynamicIcon,
    GoogleMap,
    MapAdvancedMarker,
    MapCircle,
    MapPolyline,
    MapStatus,
    TrackingChip,
    TaskTimeline,
    TaskEvidence,
  ],
  templateUrl: './task-monitoring.html',
})
export class TaskMonitoring {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly lookup = inject(TrackingLookupStore);
  readonly maps = inject(MapsLoaderService);

  readonly TASK_STATUS = TASK_STATUS;
  readonly TASK_TYPE = TASK_TYPE;
  readonly ROLE_LABEL = ROLE_LABEL;
  readonly STEP_ORDER = STEP_ORDER;
  readonly statusOptions = optionsOf(TASK_STATUS);
  readonly formatDistance = formatDistance;
  private readonly markers = new MarkerContentCache();

  private readonly query = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });

  readonly date = signal(this.route.snapshot.queryParamMap.get('date') ?? toDateKey());
  readonly branchId = signal<string | null>(null);
  readonly assigneeId = signal<string | null>(null);
  readonly status = signal<TaskStatus | null>(null);
  readonly onlyIssues = signal(false);
  readonly selectedId = signal<string | null>(this.route.snapshot.queryParamMap.get('task'));

  /** All tasks for the day (monitoring needs the whole day, not a page). */
  private readonly dayResource = httpResource<TaskSearchResponse>(() => ({
    url: `${ApiPaths.TRACKING}/tasks/search`,
    method: 'POST',
    body: {
      searchText: null,
      status: this.status(),
      type: null,
      source: null,
      branchId: this.branchId(),
      assigneeId: this.assigneeId(),
      fromDate: this.date(),
      toDate: this.date(),
      pageIndex: 0,
      pageSize: 500,
      sortOn: 'dueBy',
      sortDirection: 'asc',
    },
  }));

  readonly tasks = computed(() => {
    const all = this.dayResource.value()?.tasks ?? [];
    return this.onlyIssues() ? all.filter((t) => this.hasIssue(t)) : all;
  });
  readonly summary = computed(() => this.dayResource.value()?.summary);
  readonly loading = computed(() => this.dayResource.isLoading());
  readonly issueCount = computed(() => (this.dayResource.value()?.tasks ?? []).filter((t) => this.hasIssue(t)).length);

  private readonly taskResource = httpResource<TrackingTask>(() => {
    const id = this.selectedId();
    return id ? `${ApiPaths.TRACKING}/tasks/${id}` : undefined;
  });
  readonly task = computed(() => this.taskResource.value());

  // --- Map --------------------------------------------------------------------------------
  readonly mapOptions: google.maps.MapOptions = {
    streetViewControl: false,
    mapTypeControl: true,
    fullscreenControl: true,
    clickableIcons: false,
  };

  readonly mapCenter = computed(() => this.task()?.target.location ?? this.tasks()[0]?.target.location ?? DEFAULT_CENTER);

  readonly overviewMarkers = computed(() =>
    this.task()
      ? []
      : this.tasks().map((t) => ({
          id: t.id,
          position: t.target.location,
          title: `${t.taskNo} · ${t.title}`,
          content: this.markers.pin(`ov-${t.id}`, TASK_TYPE[t.type].label[0], TASK_STATUS[t.status].color, { small: true }),
        })),
  );

  readonly detailMarkers = computed(() => {
    const t = this.task();
    if (!t) return [];
    const list = [
      { key: 'target', position: t.target.location, title: `Geo-tag: ${t.target.name}`, content: this.markers.pin('target', '', TASK_TYPE[t.type].color, { selected: true }) },
    ];
    const v = t.verification;
    if (v?.arrivalLocation) {
      list.push({ key: 'arrival', position: v.arrivalLocation, title: `Arrival fix · ${formatDistance(v.arrivalDistanceMeters)}`, content: this.markers.badge('arrival', 'A', '#4F46E5') });
    }
    if (v?.completionLocation) {
      const ok = v.locationMatched !== false;
      list.push({ key: 'completion', position: v.completionLocation, title: `Photo fix · ${formatDistance(v.completionDistanceMeters)}`, content: this.markers.badge('completion', 'P', ok ? '#16A34A' : '#E11D48') });
    }
    return list;
  });

  readonly detailLines = computed(() => {
    const t = this.task();
    const v = t?.verification;
    if (!t || !v) return [];
    return [v.arrivalLocation, v.completionLocation]
      .filter((p): p is NonNullable<typeof p> => !!p)
      .map((p) => [t.target.location, p]);
  });

  constructor() {
    this.maps.load().catch(() => undefined);
    pollWhileVisible(() => {
      this.dayResource.reload();
      if (this.selectedId()) this.taskResource.reload();
    });

    // Follow ?task= / ?date= when navigated from other screens.
    effect(() => {
      const q = this.query();
      const task = q.get('task');
      const date = q.get('date');
      if (date && date !== this.date()) this.date.set(date);
      if (task && task !== this.selectedId()) this.selectedId.set(task);
    });
  }

  hasIssue(t: TrackingTask) {
    return t.isLate || t.status === 'Missed' || t.verification?.locationMatched === false ||
      (t.verification?.arrivalDistanceMeters ?? 0) > t.target.matchRadiusMeters;
  }

  select(id: string | null) {
    this.selectedId.set(id);
    this.router.navigate([], { queryParams: { task: id, date: this.date() }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  shiftDay(days: number) {
    const d = new Date(`${this.date()}T12:00:00`);
    d.setDate(d.getDate() + days);
    this.setDate(toDateKey(d));
  }

  setDate(date: string) {
    if (!date) return;
    this.date.set(date);
    this.select(null);
  }

  goToday() {
    this.setDate(toDateKey());
  }

  isToday() {
    return this.date() === toDateKey();
  }

  circleOptions(color: string): google.maps.CircleOptions {
    return { strokeColor: color, strokeWeight: 1.5, fillColor: color, fillOpacity: 0.12, clickable: false };
  }

  readonly lineOptions: google.maps.PolylineOptions = {
    strokeOpacity: 0,
    icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.8, strokeColor: '#475569', scale: 3 }, offset: '0', repeat: '12px' }],
    clickable: false,
  };
}
