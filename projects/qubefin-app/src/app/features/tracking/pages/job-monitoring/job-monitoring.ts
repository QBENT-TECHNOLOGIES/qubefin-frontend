import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { GoogleMap, MapAdvancedMarker, MapCircle, MapPolyline } from '@angular/google-maps';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { ApiPaths } from 'qubefin-core';
import { Job, JobSearchRequest, JobSearchResponse, JobStatus, JobSummary, JobTask, JobTaskPoint } from '../../models/job';
import { LivePosition } from '../../models/live-position';
import { MapsLoaderService } from '../../services/maps-loader.service';
import { MAX_ROUTE_STOPS, PlannedRoute, RoutingService, TRAVEL_MODE_LABEL, formatDuration } from '../../services/routing.service';
import { GeoPoint } from '../../models/geo';
import { TrackingLookupStore } from '../../stores/tracking-lookup-store';
import { DEFAULT_CENTER, centroid, formatDistance, toDateKey } from '../../utils/geo-utils';
import { MarkerContentCache, initials } from '../../utils/marker-content';
import { pollWhileVisible } from '../../utils/poll';
import { JOB_STATUS, JOB_TASK_STATUS, LIVE_STATUS, ROLE_LABEL, TASK_TYPE, TASK_TYPE_CODE } from '../../utils/tracking-labels';
import { MapStatus } from '../../components/shared/map-status/map-status';
import { TrackingChip } from '../../components/shared/tracking-chip/tracking-chip';
import { TaskEvidence } from '../../components/tasks/task-evidence/task-evidence';

type Scope = 'open' | 'Delayed' | 'Completed' | 'all';

/** Job-wise monitoring: every task point of a job on the map, with the evidence sent from the mobile app. */
@Component({
  selector: 'qfin-job-monitoring',
  imports: [DatePipe, RouterLink, MatFormFieldModule, MatSelectModule, MatTooltipModule, LucideDynamicIcon, GoogleMap, MapAdvancedMarker, MapCircle, MapPolyline, MapStatus, TrackingChip, TaskEvidence],
  templateUrl: './job-monitoring.html',
})
export class JobMonitoring {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly lookup = inject(TrackingLookupStore);
  readonly maps = inject(MapsLoaderService);
  private readonly routing = inject(RoutingService);

  readonly JOB_STATUS = JOB_STATUS;
  readonly JOB_TASK_STATUS = JOB_TASK_STATUS;
  readonly TASK_TYPE = TASK_TYPE;
  readonly LIVE_STATUS = LIVE_STATUS;
  readonly ROLE_LABEL = ROLE_LABEL;
  readonly formatDistance = formatDistance;
  readonly formatDuration = formatDuration;
  readonly TRAVEL_MODE_LABEL = TRAVEL_MODE_LABEL;
  readonly MAX_ROUTE_STOPS = MAX_ROUTE_STOPS;
  readonly today = toDateKey();
  private readonly markers = new MarkerContentCache();

  readonly scopes: { key: Scope; label: string }[] = [
    { key: 'open', label: 'Open' },
    { key: 'Delayed', label: 'Delayed' },
    { key: 'Completed', label: 'Completed' },
    { key: 'all', label: 'All' },
  ];

  readonly scope = signal<Scope>('open');
  readonly branchId = signal<string | null>(null);
  readonly assigneeId = signal<string | null>(this.route.snapshot.queryParamMap.get('employee'));
  readonly onlyIssues = signal(false);
  readonly selectedJobId = signal<string | null>(this.route.snapshot.queryParamMap.get('job'));
  readonly selectedTaskId = signal<string | null>(null);

  private readonly query = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });

  private readonly listResource = httpResource<JobSearchResponse>(() => {
    const s = this.scope();
    return {
      url: `${ApiPaths.TRACKING}/jobs/search`,
      method: 'POST',
      body: {
        searchText: null,
        status: s === 'open' || s === 'all' ? null : (s as JobStatus),
        openOnly: s === 'open',
        branchId: this.branchId(),
        assigneeId: this.assigneeId(),
        dueFrom: null,
        dueTo: null,
        pageIndex: 0,
        pageSize: 500,
        sortOn: 'completeBy',
        sortDirection: 'asc',
      } satisfies JobSearchRequest,
    };
  });

  readonly jobs = computed(() => {
    const all = this.listResource.value()?.jobs ?? [];
    return this.onlyIssues() ? all.filter((j) => this.issueOf(j)) : all;
  });
  readonly loading = computed(() => this.listResource.isLoading());
  readonly summary = computed(() => this.listResource.value()?.summary);

  private readonly jobResource = httpResource<Job>(() => {
    const id = this.selectedJobId();
    return id ? `${ApiPaths.TRACKING}/jobs/${id}` : undefined;
  });
  readonly job = computed(() => (this.selectedJobId() ? this.jobResource.value() : undefined));
  readonly visibleTasks = computed(() => (this.job()?.tasks ?? []).filter((t) => t.status === 'Pending' || t.status === 'Completed'));
  readonly task = computed(() => this.visibleTasks().find((t) => t.id === this.selectedTaskId()) ?? null);

  /** Pending task points of every open job in the filter, for the overview. */
  private readonly pointsResource = httpResource<JobTaskPoint[]>(() => {
    if (this.selectedJobId()) return undefined;
    const params: Record<string, string> = {};
    if (this.branchId()) params['branchId'] = this.branchId()!;
    if (this.assigneeId()) params['assigneeId'] = this.assigneeId()!;
    return { url: `${ApiPaths.TRACKING}/jobs/task-points`, params };
  });

  /** Where the assignee is now (today only). */
  private readonly liveResource = httpResource<LivePosition[]>(() => {
    const j = this.job();
    if (!j?.assigneeId) return undefined;
    return `${ApiPaths.TRACKING}/live/positions`;
  });
  readonly assigneeNow = computed(() => {
    const j = this.job();
    return (this.liveResource.value() ?? []).find((p) => p.employeeId === j?.assigneeId && !!p.location) ?? null;
  });

  // --- Planned route (Routes API) ----------------------------------------------------------
  readonly plan = signal<{ jobId: string; taskIds: string[]; from: string; to: string; route: PlannedRoute } | null>(null);
  readonly planLoading = signal(false);
  readonly planError = signal<string | null>(null);
  readonly pendingTasks = computed(() => (this.job()?.tasks ?? []).filter((t) => t.status === 'Pending'));
  /** The plan of the job on screen (cleared when another job is opened). */
  readonly activePlan = computed(() => {
    const p = this.plan();
    return p && p.jobId === this.selectedJobId() ? p : null;
  });
  /** Task id → visiting order in the plan (1-based). */
  readonly planSeq = computed(() => {
    const p = this.activePlan();
    const map = new Map<string, number>();
    p?.route.order.forEach((stopIndex, i) => map.set(p.taskIds[stopIndex], i + 1));
    return map;
  });
  readonly planLine: google.maps.PolylineOptions = { strokeColor: '#2563EB', strokeOpacity: 0.85, strokeWeight: 5, clickable: false };

  /**
   * Best order for the pending tasks: from where the employee is now (if on duty today), otherwise from their branch,
   * ending back at the branch. Two-wheeler.
   */
  async planRoute() {
    const j = this.job();
    if (!j) return;
    const tasks = this.pendingTasks();
    if (!tasks.length) return;
    const officer = j.assigneeId ? this.lookup.officerById().get(j.assigneeId) : undefined;
    const branch = this.lookup.branchById().get(officer?.branchId ?? tasks[0].target.branchId);
    const now = this.assigneeNow();
    const onDuty = !!now?.location && ['OnTask', 'AtBranch', 'Moving', 'Idle'].includes(now.status);
    const origin: GeoPoint | null = onDuty ? now!.location! : (branch?.location ?? null);
    const destination = branch?.location ?? origin;
    if (!origin) {
      this.planError.set('No start point: the branch has no location.');
      return;
    }
    this.planLoading.set(true);
    this.planError.set(null);
    try {
      const route = await this.routing.plan(origin, tasks.map((t) => t.target.location), { destination, optimize: true });
      this.plan.set({
        jobId: j.id,
        taskIds: tasks.map((t) => t.id),
        from: onDuty ? `${now!.employeeName.split(' ')[0]}'s current position` : `${branch?.name ?? 'the'} branch`,
        to: `${branch?.name ?? 'the'} branch`,
        route,
      });
    } catch (err) {
      this.plan.set(null);
      this.planError.set(err instanceof Error ? err.message : 'Route could not be calculated.');
    } finally {
      this.planLoading.set(false);
    }
  }

  clearPlan() {
    this.plan.set(null);
    this.planError.set(null);
  }

  // --- Map --------------------------------------------------------------------------------
  readonly mapOptions: google.maps.MapOptions = { streetViewControl: false, mapTypeControl: true, fullscreenControl: true, clickableIcons: false };
  readonly center = signal(DEFAULT_CENTER);
  readonly zoom = signal(10);

  readonly overviewMarkers = computed(() =>
    this.selectedJobId()
      ? []
      : (this.pointsResource.value() ?? []).map((p) => ({
          key: p.taskId,
          jobId: p.jobId,
          position: p.location,
          title: `${p.jobNo} · ${p.title}${p.assigneeName ? ' · ' + p.assigneeName : ''}`,
          content: this.markers.pin(`ov-${p.taskId}`, TASK_TYPE_CODE[p.type], JOB_STATUS[p.jobStatus].color, { small: true }),
        })),
  );

  readonly taskMarkers = computed(() => {
    const seq = this.planSeq();
    return this.visibleTasks().map((t) => ({
      task: t,
      content: this.markers.pin(`t-${t.id}`, seq.has(t.id) ? String(seq.get(t.id)) : TASK_TYPE_CODE[t.type], t.verification?.locationMatched === false ? '#E11D48' : JOB_TASK_STATUS[t.status].color, {
        selected: t.id === this.selectedTaskId(),
      }),
    }));
  });

  readonly evidenceMarkers = computed(() => {
    const v = this.task()?.verification;
    if (!v) return [];
    const list: { key: string; position: google.maps.LatLngLiteral; title: string; content: HTMLElement }[] = [];
    if (v.arrivalLocation) list.push({ key: 'a', position: v.arrivalLocation, title: `Arrival fix · ${formatDistance(v.arrivalDistanceMeters)}`, content: this.markers.badge('arrival', 'A', '#4F46E5') });
    if (v.completionLocation) list.push({ key: 'p', position: v.completionLocation, title: `Photo fix · ${formatDistance(v.completionDistanceMeters)}`, content: this.markers.badge('photo', 'P', v.locationMatched === false ? '#E11D48' : '#16A34A') });
    return list;
  });

  readonly evidenceLines = computed(() => {
    const t = this.task();
    const v = t?.verification;
    if (!t || !v) return [];
    return [v.arrivalLocation, v.completionLocation].filter((p): p is NonNullable<typeof p> => !!p).map((p) => [t.target.location, p]);
  });

  readonly assigneeMarker = computed(() => {
    const p = this.assigneeNow();
    return p ? { position: p.location!, title: `${p.employeeName} now · ${LIVE_STATUS[p.status].label}`, content: this.markers.badge('who', initials(p.employeeName), LIVE_STATUS[p.status].color) } : null;
  });

  readonly lineOptions: google.maps.PolylineOptions = {
    strokeOpacity: 0,
    icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.8, strokeColor: '#475569', scale: 3 }, offset: '0', repeat: '12px' }],
    clickable: false,
  };

  constructor() {
    this.maps.load().catch(() => undefined);
    pollWhileVisible(() => {
      this.listResource.reload();
      if (this.selectedJobId()) {
        this.jobResource.reload();
        this.liveResource.reload();
      } else this.pointsResource.reload();
    });

    effect(() => {
      const id = this.query().get('job');
      if (id && id !== this.selectedJobId()) this.selectedJobId.set(id);
    });

    // Fit the view when the selection changes (not on every poll).
    let fitted = '';
    effect(() => {
      const t = this.task();
      const j = this.job();
      const ov = this.overviewMarkers();
      const key = t ? `t:${t.id}` : j ? `j:${j.id}` : ov.length ? `ov:${this.branchId()}:${this.assigneeId()}` : '';
      if (!key || key === fitted) return;
      fitted = key;
      if (t) {
        this.center.set({ ...t.target.location });
        this.zoom.set(16);
      } else if (j) {
        const pts = this.visibleTasks().map((x) => x.target.location);
        this.center.set(centroid(pts, DEFAULT_CENTER));
        this.zoom.set(pts.length > 1 ? 12 : 15);
      } else {
        this.center.set(centroid(ov.map((m) => m.position), DEFAULT_CENTER));
        this.zoom.set(10);
      }
    });
  }

  issueOf(j: JobSummary): string | null {
    if (j.status === 'Delayed') return 'Delayed';
    return null;
  }

  pct(j: JobSummary) {
    return j.taskCount ? Math.round((j.doneCount / j.taskCount) * 100) : 0;
  }

  mismatches(j: Job) {
    return j.tasks.filter((t) => t.verification?.locationMatched === false).length;
  }

  selectJob(id: string | null) {
    if (id !== this.selectedJobId()) this.clearPlan();
    this.selectedJobId.set(id);
    this.selectedTaskId.set(null);
    this.router.navigate([], { queryParams: { job: id }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  selectTask(t: JobTask | null) {
    this.selectedTaskId.set(t && t.id !== this.selectedTaskId() ? t.id : null);
  }

  circleOptions(color: string): google.maps.CircleOptions {
    return { strokeColor: color, strokeWeight: 1.5, fillColor: color, fillOpacity: 0.1, clickable: false };
  }

  colorOf(t: JobTask) {
    return t.verification?.locationMatched === false ? '#E11D48' : JOB_TASK_STATUS[t.status].color;
  }
}
