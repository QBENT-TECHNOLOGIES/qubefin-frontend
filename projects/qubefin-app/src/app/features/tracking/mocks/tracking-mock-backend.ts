import { HttpErrorResponse, HttpEvent, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, delay, of, throwError } from 'rxjs';
import {
  ADMIN_USER,
  MockDb,
  buildRoute,
  dayOf,
  mockDb,
  moveTask,
  newJob,
  newTask,
  pushHistory,
  refreshJob,
  simulateLivePositions,
} from './tracking-mock-db';
import {
  AddTasksMessage,
  AddTasksRequest,
  AddTasksResponse,
  CreateJobRequest,
  CreateJobResponse,
  ExtendJobRequest,
  Job,
  JobActionMessage,
  JobPermissions,
  JobSearchRequest,
  JobSearchResponse,
  JobSummary,
  JobTaskPoint,
  NewTaskInput,
  RemarksRequest,
  SkippedTask,
  TaskTarget,
  TaskType,
  TaskWarning,
  TransferJobRequest,
} from '../models/job';
import {
  AddOdToJobRequest,
  AddOdToJobResponse,
  OdFollowUpSummary,
  OdMember,
  OdMemberSearchRequest,
  OdMemberSearchResponse,
} from '../models/od-member';
import { FieldOfficer, TrackingViewer, isAdminRole, unitIdsOf } from '../models/field-officer';
import { AlertSearchRequest, AlertSearchResponse, AlertType, ResolveAlertRequest } from '../models/tracking-alert';
import { ApprovalDecisionRequest } from '../models/approval-request';
import { GeoTag, GeoTagKind, GeoTagPoint, GeoTagPointsResponse } from '../models/geo-tag';
import { TrackingSettings } from '../models/tracking-settings';
import { TrackingGroup } from '../models/geo';
import { MOCK_ACTOR_KEY } from './mock-actor-key';
import { toDateKey } from '../utils/geo-utils';
import { LOCATION_NOT_VERIFIED, PendingElsewhere, ROLE_RANK, canAssignWorkTo, canMonitor, duplicateCheck, inScope, isOpenJob, oversees, jobBranchConflict, needsVerifiedLocation, targetKey } from '../utils/job-rules';
import { inDpdRange } from '../utils/dpd';
import { roleLabel, TASK_TYPE } from '../utils/tracking-labels';

const SEGMENT = 'tracking-api/';
const LATENCY_MS = 250;

/**
 * Mock tracking-api. Loaded on demand by trackingMockInterceptor, so none of this
 * (or the seed data) is in the main bundle.
 */
export function handleMockRequest(req: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
  const idx = req.url.indexOf(SEGMENT);
  const url = new URL(req.urlWithParams, 'http://mock.local');
  const path = req.url.slice(idx + SEGMENT.length).split('?')[0].replace(/\/+$/, '');
  try {
    const result = route(req, path, url.searchParams);
    if (result === NOT_FOUND) return fail(404, `Mock tracking-api has no handler for ${req.method} ${path}`);
    return of(new HttpResponse({ status: 200, body: structuredClone(result) })).pipe(delay(LATENCY_MS));
  } catch (e) {
    if (e instanceof MockError) return fail(e.status, e.message);
    throw e;
  }
}

const NOT_FOUND = Symbol('not-found');

class MockError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function fail(status: number, message: string): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status, error: { message }, statusText: 'Mock error' })).pipe(delay(LATENCY_MS));
}

const bad = (message: string) => new MockError(400, message);
const forbidden = (message: string) => new MockError(403, message);

// ---------------------------------------------------------------------------------------------
// Who is asking. The real backend takes this from the access token; the mock lets the Jobs page
// switch between people ("Acting as", stored in sessionStorage) so the role rules can be tried out.
// ---------------------------------------------------------------------------------------------


type Viewer = TrackingViewer & { id: string };
let viewer: Viewer;

function readActorId(): string | null {
  try {
    return sessionStorage.getItem(MOCK_ACTOR_KEY);
  } catch {
    return null;
  }
}

function currentViewer(d: MockDb): Viewer {
  const o = d.officers.find((x) => x.id === readActorId());
  if (!o) {
    d.currentUser = ADMIN_USER;
    return { id: ADMIN_USER.id, employeeId: null, name: ADMIN_USER.name, role: 'Admin', unitName: 'All branches', organisationUnitIds: d.branches.map((b) => b.id), canCreateJobs: true };
  }
  d.currentUser = { id: o.id, name: o.name };
  const v = { role: o.role, organisationUnitIds: unitIdsOf(o) };
  return { id: o.id, employeeId: o.id, name: o.name, role: o.role, unitName: o.unitName, organisationUnitIds: unitIdsOf(o), canCreateJobs: d.officers.some((x) => canAssignWorkTo(v, x)) };
}

/** Rank of whoever created a job (an officer, or an administrator). */
function rankOfPerson(d: MockDb, id: string): number {
  const o = d.officers.find((x) => x.id === id);
  return o ? ROLE_RANK[o.role] : ROLE_RANK['Admin'];
}

/**
 * Jobs a user can see: everything for an Admin; their own jobs (created or assigned); and jobs inside their
 * scope held by someone below them (a BM sees the jobs an AM gave to the COs of the branch) or by an ABM of a BM's branch.
 */
function canSee(_d: MockDb, j: Job): boolean {
  if (isAdminRole(viewer.role) || j.assigneeId === viewer.id || j.createdBy === viewer.id) return true;
  if (!j.organisationUnitIds.length || !inScope(viewer, j.organisationUnitIds)) return false;
  return oversees(viewer.role, j.assigneeRole);
}

/**
 * Contract §3.3. Senior = the creator, or anyone above the creator in scope: may transfer and cancel.
 * Managers above the assignee may also update (add tasks, extend, cancel / reject a task).
 * The assignee gets nothing on the web: no delegation, and own tasks are added from the mobile app.
 */
function permissionsOf(d: MockDb, j: Job): JobPermissions {
  const can = isOpenJob(j.status) && j.assigneeId !== viewer.id;
  const senior =
    isAdminRole(viewer.role) || j.createdBy === viewer.id || (ROLE_RANK[viewer.role] < rankOfPerson(d, j.createdBy) && inScope(viewer, j.organisationUnitIds));
  // Managers above the assignee, and a BM over the ABM of their branch (contract §3.3).
  const managesAssignee = oversees(viewer.role, j.assigneeRole) && inScope(viewer, j.organisationUnitIds);
  return {
    canTransfer: can && j.openCount > 0 && senior,
    canCancel: can && senior,
    canUpdate: can && (senior || managesAssignee),
  };
}

/** Stamps the caller's permissions on a job before it is returned. */
function out(d: MockDb, j: Job): Job {
  j.permissions = permissionsOf(d, j);
  // Per caller, like the real backend: only a pending self-added task, and only for someone who may update the job.
  j.tasks.forEach((t) => (t.canReject = j.permissions.canUpdate && t.origin === 'SelfAdded' && t.status === 'Pending'));
  return j;
}

function requirePermission(d: MockDb, j: Job, key: keyof JobPermissions, what: string) {
  if (permissionsOf(d, j)[key]) return;
  if (!isOpenJob(j.status)) throw bad(`${j.jobCode} is ${j.status.toLowerCase()}.`);
  if (j.assigneeId === viewer.id) {
    throw forbidden(`${j.jobCode} is assigned to you, so you cannot ${what}. Work cannot be delegated; add tasks to your own job from the mobile app.`);
  }
  if (key === 'canUpdate') throw forbidden(`You can view ${j.jobCode} but not change it.`);
  throw forbidden(`Only the person who created ${j.jobCode} (${j.createdByName}) or someone above them can ${what}.`);
}

/** The caller may only give work to people below them in their own scope. */
function checkAssignable(o: FieldOfficer) {
  if (!canAssignWorkTo(viewer, o)) {
    throw forbidden(`${o.name} (${roleLabel(o.role)}, ${o.unitName}) is not below you in ${viewer.unitName}, so you cannot give them work.`);
  }
}

/** Someone the caller may monitor (contract §2 field-officers): everyone for an Admin. */
function monitors(d: MockDb, employeeId: string): boolean {
  if (isAdminRole(viewer.role)) return true;
  const o = d.officers.find((x) => x.id === employeeId);
  return !!o && canMonitor(viewer, o);
}

/** Geo-tags in the caller's scope (§8): employee homes of people they may monitor, other places in their branches. */
function geoTagVisible(d: MockDb, g: { kind: GeoTagKind; refId: string; branchId: string }): boolean {
  if (isAdminRole(viewer.role)) return true;
  if (g.kind === 'EmployeeHome') return monitors(d, g.refId);
  return inScope(viewer, [g.branchId]);
}

const adminOnly = (what: string) => {
  if (!isAdminRole(viewer.role)) throw forbidden(`Only a Super Admin or Application Administrator can ${what}.`);
};

function route(req: HttpRequest<unknown>, path: string, q: URLSearchParams): unknown {
  const d = mockDb();
  const seg = path.split('/');
  const body = (req.body ?? {}) as Record<string, any>;
  const m = req.method;
  // Delayed status depends on the date, so bring every job up to date first.
  const today = toDateKey();
  d.jobs.forEach((j) => refreshJob(j, today));
  viewer = currentViewer(d);

  // ---- Lookups ---------------------------------------------------------------------------
  if (m === 'GET' && path === 'organization-units') return d.branches.filter((b) => inScope(viewer, [b.id]));
  if (m === 'GET' && path === 'groups') {
    // Light lookup for filters: groups in scope with their mapped branch and Credit Officer.
    const branchId = q.get('branchId');
    const coId = q.get('creditOfficerId');
    const branchName = new Map(d.branches.map((b) => [b.id, b.name]));
    return d.groups
      .filter((g) => inScope(viewer, [g.branchId]) && (!branchId || g.branchId === branchId) && (!coId || g.creditOfficerId === coId))
      .map((g) => ({ id: g.id, code: g.code, name: g.name, branchId: g.branchId, branchName: branchName.get(g.branchId) ?? '', creditOfficerId: g.creditOfficerId, creditOfficerName: g.creditOfficerName }))
      .sort((a, b) => a.name.localeCompare(b.name)) satisfies TrackingGroup[];
  }
  if (m === 'GET' && path === 'field-officers') {
    const branchId = q.get('organizationUnitId'); // the API spells the query parameter with a z
    return d.officers
      .filter((o) => canMonitor(viewer, o) && (!branchId || unitIdsOf(o).includes(branchId)))
      .map((o) => ({ ...o, canAssign: canAssignWorkTo(viewer, o) }));
  }

  // ---- Jobs ------------------------------------------------------------------------------
  if (m === 'POST' && path === 'jobs/search') return searchJobs(d, body as JobSearchRequest);
  if (m === 'GET' && path === 'jobs/open') return openJobs(d, q.get('assigneeId'), q.get('branchId'));
  if (m === 'GET' && path === 'jobs/task-points') return taskPoints(d, q);
  if (m === 'POST' && path === 'jobs') {
    // Same shape as the API (C1): { jobId, message }.
    const r = createJob(d, body as CreateJobRequest);
    return { jobId: r.job.id, message: withNotes(`Job ${r.job.jobCode} created for ${r.job.assigneeName} with ${r.job.taskCount} task(s).`, r) } satisfies CreateJobResponse;
  }
  if (seg[0] === 'jobs' && seg.length >= 2) {
    const job = d.jobs.find((j) => j.id === seg[1] && canSee(d, j));
    if (!job) throw new MockError(404, 'Job not found');
    if (m === 'GET' && seg.length === 2) return out(d, job);
    if (m === 'GET' && seg[2] === 'history') {
      return d.history.filter((h) => h.jobId === job.id).sort((a, b) => b.performedAt.localeCompare(a.performedAt) || b.id.localeCompare(a.id));
    }
    // C3–C7 answer with a plain message, like the API.
    if (m === 'PUT' && seg[2] === 'transfer') {
      const r = transferJob(d, job, body as TransferJobRequest);
      const text = r.newJob ? `${r.newJob.taskCount} task(s) of ${job.jobCode} moved to ${r.newJob.jobCode} for ${r.newJob.assigneeName}.` : `${job.jobCode} transferred to ${job.assigneeName}.`;
      return withNotes(text, { warnings: [], skipped: r.skipped }) satisfies JobActionMessage;
    }
    if (m === 'PUT' && seg[2] === 'extend') {
      const old = job.endDate;
      extendJob(d, job, body as ExtendJobRequest);
      return `${job.jobCode} complete-by date extended from ${dayLabel(old)} to ${dayLabel(job.endDate)}.` satisfies JobActionMessage;
    }
    if (m === 'PUT' && seg[2] === 'cancel') {
      cancelJob(d, job, body as RemarksRequest);
      return `${job.jobCode} cancelled.` satisfies JobActionMessage;
    }
    if (m === 'POST' && seg[2] === 'tasks' && seg.length === 3) {
      // Same shape as the API (C2): a plain message.
      const tasks = (body as AddTasksRequest).tasks;
      const r = addTasks(d, job, tasks, 'TasksAdded');
      return withNotes(`${tasks.length - r.skipped.length} task(s) added to ${job.jobCode}.`, r) satisfies AddTasksMessage;
    }
    if (m === 'PUT' && seg[2] === 'tasks' && seg.length === 5) {
      closeTask(d, job, seg[3], seg[4], body as RemarksRequest);
      const t = job.tasks.find((x) => x.id === seg[3])!;
      return `Task ${t.taskNo} ${seg[4] === 'reject' ? 'rejected' : 'cancelled'}.` satisfies JobActionMessage;
    }
  }

  // ---- OD members -----------------------------------------------------------------
  if (m === 'POST' && path === 'od-members/search') return searchOverdue(d, body as OdMemberSearchRequest);
  if (m === 'POST' && path === 'od-members/add-to-job') return addOdToJob(d, body as AddOdToJobRequest);

  // ---- Live ------------------------------------------------------------------------------
  if (m === 'GET' && path === 'live/positions') {
    const branchId = q.get('branchId');
    return simulateLivePositions().filter((p) => monitors(d, p.employeeId) && (!branchId || p.branchId === branchId));
  }
  if (m === 'GET' && seg[0] === 'employees' && seg[2] === 'route') {
    if (!monitors(d, seg[1])) throw new MockError(404, 'Employee not found');
    return buildRoute(seg[1], q.get('date') ?? today);
  }

  // ---- Alerts ----------------------------------------------------------------------------
  if (m === 'POST' && path === 'alerts/search') return searchAlerts(d, body as AlertSearchRequest);
  if (m === 'GET' && path === 'alerts/open-count') return d.alerts.filter((a) => a.status === 'Open').length;
  if (seg[0] === 'alerts' && seg.length === 3 && m === 'PUT') {
    const alert = d.alerts.find((a) => a.id === seg[1]);
    if (!alert) throw new MockError(404, 'Alert not found');
    const nowIso = new Date().toISOString();
    if (seg[2] === 'acknowledge') {
      if (alert.status !== 'Open') throw bad('Only open alerts can be acknowledged.');
      alert.status = 'Acknowledged';
      alert.acknowledgedByName = d.currentUser.name;
      alert.acknowledgedAt = nowIso;
      return alert;
    }
    if (seg[2] === 'resolve') {
      if (alert.status === 'Resolved') throw bad('This alert is already resolved.');
      alert.status = 'Resolved';
      alert.acknowledgedByName ??= d.currentUser.name;
      alert.acknowledgedAt ??= nowIso;
      alert.resolvedByName = d.currentUser.name;
      alert.resolvedAt = nowIso;
      alert.resolutionRemarks = (body as ResolveAlertRequest).remarks;
      return alert;
    }
  }

  // ---- Approvals -------------------------------------------------------------------------
  if (m === 'GET' && path === 'approvals') {
    const status = q.get('status');
    return d.approvals.filter((a) => monitors(d, a.employeeId) && (!status || a.status === status));
  }
  if (m === 'PUT' && seg[0] === 'approvals' && seg[2] === 'decision') {
    const req2 = d.approvals.find((a) => a.id === seg[1] && monitors(d, a.employeeId));
    if (!req2) throw new MockError(404, 'Request not found');
    // Product owner, 4 Nov 2026: for now only a Super Admin / Application Administrator decides (contract §7).
    adminOnly('approve or reject out-of-radius requests');
    if (req2.status !== 'Pending') throw bad('This request has already been decided.');
    const dec = body as ApprovalDecisionRequest;
    req2.status = dec.approved ? 'Approved' : 'Rejected';
    req2.decidedByName = d.currentUser.name;
    req2.decidedAt = new Date().toISOString();
    req2.decisionRemarks = dec.remarks;
    return req2;
  }

  // ---- Geo-tags --------------------------------------------------------------------------
  if (m === 'GET' && path === 'geo-tags/points') {
    const kinds = (q.get('kinds') ?? q.get('kind') ?? 'GroupCentre').split(',').filter(Boolean) as GeoTagKind[];
    const branchId = q.get('organisationUnitId');
    const all = d.geoTags.filter((g) => kinds.includes(g.kind) && (!branchId || g.branchId === branchId) && geoTagVisible(d, g));
    const od = new Map(d.odMembers.map((c) => [c.id, c]));
    const members = new Map(d.members.map((c) => [c.id, c]));
    const groups = new Map(d.groups.map((g) => [g.id, g]));
    const untaggedByKind: Partial<Record<GeoTagKind, number>> = {};
    all.filter((g) => !g.location).forEach((g) => (untaggedByKind[g.kind] = (untaggedByKind[g.kind] ?? 0) + 1));
    const points: GeoTagPoint[] = all
      .filter((g) => !!g.location)
      .map((g) => {
        const c = g.kind === 'OdMember' ? od.get(g.refId) : undefined;
        const mem = g.kind === 'Member' ? members.get(g.refId) : undefined;
        const grp = g.kind === 'GroupCentre' ? groups.get(g.refId) : undefined;
        const map = c ?? mem ?? grp;
        return {
          creditOfficerId: map?.creditOfficerId ?? null,
          creditOfficerName: map?.creditOfficerName ?? null,
          groupId: c?.groupId ?? mem?.groupId ?? null,
          groupName: c?.groupName ?? mem?.groupName ?? null,
          id: g.id, kind: g.kind, refId: g.refId, name: g.name, refCode: g.refCode, organisationUnitId: g.branchId, branchName: g.branchName,
          address: g.address, location: g.location!, taskLocationMatchInMeters: g.radiusMeters, verified: g.verified, dpd: c?.dpd ?? null, overdueAmount: c?.overdueAmount ?? null,
          taggedByName: g.taggedByName, taggedAt: g.taggedAt,
        } satisfies GeoTagPoint;
      });
    return { points, untaggedByKind } satisfies GeoTagPointsResponse;
  }
  if (m === 'GET' && path === 'geo-tags') {
    const kind = (q.get('kind') ?? 'Branch') as GeoTagKind;
    const text = (q.get('searchText') ?? '').toLowerCase().trim();
    const branchIds = (q.get('organisationUnitId') ?? '').split(',').filter(Boolean);
    const onlyUntagged = q.get('onlyUntagged') === 'true';
    return d.geoTags.filter(
      (g) =>
        g.kind === kind &&
        geoTagVisible(d, g) &&
        (!branchIds.length || branchIds.includes(g.branchId)) &&
        (!onlyUntagged || !g.location) &&
        (!text || g.name.toLowerCase().includes(text) || g.refCode.toLowerCase().includes(text)),
    ).map(({ id: _id, ...tag }) => tag satisfies GeoTag);
  }
  // No PUT geo-tags: Geo Tags/POIs is view only on the web (product owner, 4 Nov 2026). Locations come from the mobile app.

  // ---- Settings --------------------------------------------------------------------------
  if (m === 'GET' && path === 'settings') return d.settings;
  if (m === 'PUT' && path === 'settings') {
    adminOnly('change tracking settings'); // product owner, 4 Nov 2026
    const s = body as TrackingSettings;
    if (s.homeRadiusMeters <= 0 || s.stationaryMinutes <= 0 || s.branchRadiusKm <= 0 || s.stopMinMinutes <= 0 || s.stopRadiusMeters <= 0) {
      throw bad('Thresholds must be greater than zero.');
    }
    d.settings = { ...s, lastModifiedByName: d.currentUser.name, lastModifiedAt: new Date().toISOString() };
    d.branches.forEach((b) => (b.branchOperatingRadiusInKm = s.branchRadiusKm * 1000)); // metres
    return d.settings;
  }

  return NOT_FOUND;
}

// ---------------------------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------------------------

function summary(j: Job): JobSummary {
  const { tasks: _t, jobDescription: _d, createdBy: _c, permissions: _p, ...rest } = j;
  return rest;
}

function officerOr400(d: MockDb, id: string | null | undefined): FieldOfficer {
  const o = d.officers.find((x) => x.id === id);
  if (!o) throw bad('Selected employee was not found.');
  return o;
}

const branchName = (d: MockDb) => (id: string) => d.branches.find((b) => b.id === id)?.name ?? 'another branch';

function checkBranches(d: MockDb, officer: FieldOfficer, branchIds: string[]) {
  const conflict = jobBranchConflict(officer, branchIds, branchName(d));
  if (conflict) throw bad(conflict);
}

function validateDate(key: string | null | undefined, label: string) {
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) throw bad(`${label} is required.`);
}

/** Days a job is active: start (or creation day) to complete-by; a delayed job stays active until today. */
function windowOf(j: Pick<Job, 'startDate' | 'createdOn' | 'endDate'>): [string, string] {
  const start = j.startDate ?? dayOf(j.createdOn);
  const today = toDateKey();
  return [start, j.endDate < today ? today : j.endDate];
}

/**
 * The same task type at the same place, pending in other open jobs (any dates). `duplicateCheck` (utils/job-rules)
 * then decides: the same person with overlapping dates → skipped; someone else → added with a warning.
 */
function pendingElsewhere(d: MockDb, t: { type: TaskType; target: TaskTarget }, excludeJobId: string): PendingElsewhere[] {
  const key = targetKey(t.type, t.target);
  return d.jobs
    .filter((j) => j.id !== excludeJobId && isOpenJob(j.status))
    .filter((j) => j.tasks.some((x) => x.status === 'Pending' && targetKey(x.taskType, x.target) === key))
    .map((j) => ({ jobNo: j.jobCode, assigneeId: j.assigneeId, assigneeName: j.assigneeName, window: windowOf(j) }));
}

const PRIORITIES = ['VeryHigh', 'High', 'Medium', 'Low'];

/** Who goes along on a task: an employee who works in the task's branch, or the caller. Never the assignee. */
function companionOf(d: MockDb, job: Job, t: NewTaskInput): { id: string; name: string } | null {
  if (!t.coOrdinatedBy) return null;
  if (t.coOrdinatedBy === job.assigneeId) throw bad(`${t.taskTitle}: ${job.assigneeName} holds the job, so cannot also be the person going along.`);
  if (t.coOrdinatedBy === viewer.employeeId) return { id: viewer.id, name: viewer.name };
  const o = d.officers.find((x) => x.id === t.coOrdinatedBy);
  if (!o) throw bad(`${t.taskTitle}: the person going along was not found.`);
  if (!unitIdsOf(o).includes(t.target.organisationUnitId)) throw bad(`${t.taskTitle}: ${o.name} does not work in ${t.target.branchName}.`);
  return { id: o.id, name: o.name };
}

/** Groups, members and OD members can only be put in a job once their location is verified (from the mobile app). */
function locationVerified(d: MockDb, kind: string, refId: string | null): boolean {
  if (!needsVerifiedLocation(kind) || !refId) return true;
  return !!d.geoTags.find((g) => g.kind === kind && g.refId === refId)?.verified;
}

function validateTaskInput(t: NewTaskInput): string | null {
  if (!t.taskTitle?.trim()) return 'Title is required.';
  if (!TASK_TYPE[t.taskType]) return 'Unknown task type.';
  if (t.priority && !PRIORITIES.includes(t.priority)) return 'Unknown priority.';
  if (!t.target?.targetLocation || typeof t.target.targetLocation.lat !== 'number') return 'Every task needs a location.';
  if (!t.target.organisationUnitId) return 'The task location must belong to a branch.';
  return null;
}

/**
 * Adds tasks. Skipped (not failed): listed twice, already pending in this job, already pending with the same person,
 * location not verified. Added with a warning: pending with someone else. The branch rule fails the whole request.
 */
function addTasks(d: MockDb, job: Job, tasks: NewTaskInput[], action: 'TasksAdded' | 'Created', silent = false): AddTasksResponse {
  if (!isOpenJob(job.status) && action === 'TasksAdded') throw bad(`${job.jobCode} is ${job.status.toLowerCase()}; tasks can no longer be added.`);
  if (action === 'TasksAdded') requirePermission(d, job, 'canUpdate', 'add tasks to it');
  if (!tasks?.length) throw bad('Add at least one task.');
  tasks.forEach((t) => {
    const err = validateTaskInput(t);
    if (err) throw bad(`${t.taskTitle || 'Task'}: ${err}`);
  });
  const outside = tasks.find((t) => !inScope(viewer, [t.target.organisationUnitId]));
  if (outside) throw forbidden(`${outside.target.branchName} is outside your ${viewer.unitName}.`);
  checkBranches(d, officerOr400(d, job.assigneeId), [...new Set([...job.organisationUnitIds, ...tasks.map((t) => t.target.organisationUnitId)])]);
  const companions = tasks.map((t) => companionOf(d, job, t));

  const skipped: SkippedTask[] = [];
  const warnings: TaskWarning[] = [];
  const seen = new Set<string>();
  const now = new Date();
  const added: string[] = [];
  tasks.forEach((t, i) => {
    const key = targetKey(t.taskType, t.target);
    if (seen.has(key)) return skipped.push({ title: t.taskTitle, reason: 'Listed twice in this request' });
    seen.add(key);
    if (!locationVerified(d, t.target.kind, t.target.originRefId)) return skipped.push({ title: t.taskTitle, reason: LOCATION_NOT_VERIFIED });
    if (job.tasks.some((x) => x.status === 'Pending' && targetKey(x.taskType, x.target) === key)) return skipped.push({ title: t.taskTitle, reason: 'Already pending in this job' });
    const dup = duplicateCheck(job.assigneeId, t.taskType, windowOf(job), pendingElsewhere(d, { type: t.taskType, target: t.target }, job.id));
    if (dup.block) return skipped.push({ title: t.taskTitle, reason: cap(dup.block) });
    if (dup.warn) warnings.push({ title: t.taskTitle, reason: cap(dup.warn) });
    const created = newTask(d, job, {
      type: t.taskType,
      title: t.taskTitle.trim(),
      notes: t.notes?.trim() || null,
      priority: t.priority || 'Medium',
      accompaniedBy: companions[i],
      target: t.target,
      origin: 'Assigned',
      addedBy: d.currentUser,
      addedAt: now,
    });
    added.push(created.taskNo);
    return undefined;
  });
  refreshJob(job);
  if (added.length && !silent) pushHistory(d, job, action, d.currentUser, now, { taskNos: added });
  return { job: out(d, job), skipped, warnings };
}

const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** The API puts warnings and skipped tasks in the message: "… Note: <task> — <reason>." */
function withNotes(text: string, r: Pick<AddTasksResponse, 'warnings' | 'skipped'>): string {
  const notes = [...r.warnings, ...r.skipped].map((x) => `${x.title} — ${x.reason}`);
  return notes.length ? `${text} Note: ${notes.join('; ')}.` : text;
}

function createJob(d: MockDb, r: CreateJobRequest): AddTasksResponse {
  if (!r.jobTitle?.trim()) throw bad('Job title is required.');
  validateDate(r.endDate, 'Complete-by date');
  if (r.endDate < toDateKey()) throw bad('The complete-by date cannot be in the past.');
  if (r.startDate && r.startDate > r.endDate) throw bad('Start date must be on or before the complete-by date.');
  if (!r.tasks?.length) throw bad('A job needs at least one task.');
  if (!viewer.canCreateJobs) throw forbidden('There is nobody below you to give a job to.');
  if (!r.assigneeId) throw bad('Select who will do this job.');
  const assignee = officerOr400(d, r.assigneeId);
  checkAssignable(assignee);
  checkBranches(d, assignee, [...new Set(r.tasks.map((t) => t.target.organisationUnitId))]);

  const now = new Date();
  const job = newJob(d, { title: r.jobTitle.trim(), description: r.jobDescription?.trim() || null, creator: { ...d.currentUser, unitName: viewer.unitName }, assignee, startFrom: r.startDate, completeBy: r.endDate, createdAt: now });
  const res = addTasks(d, job, r.tasks, 'Created', true);
  if (!job.tasks.length) {
    d.counters.job--;
    throw bad(`No task could be added: ${res.skipped.map((s) => `${s.title} – ${s.reason}`).join('; ')}`);
  }
  d.jobs.unshift(job);
  pushHistory(d, job, 'Created', d.currentUser, now, { toAssigneeName: assignee.name, taskNos: job.tasks.map((t) => t.taskNo) });
  return { ...res, job: out(d, job) };
}

function setAssignee(job: Job, o: FieldOfficer) {
  job.assigneeId = o.id;
  job.assigneeName = o.name;
  job.assigneeRole = o.role;
  job.unitName = o.unitName;
}

/**
 * Transfer (contract rule 3.2.7). Pending tasks the new assignee already has pending elsewhere (same type, same place,
 * overlapping dates) do not move: they stay in this job and come back in `skipped`.
 */
/** What the mock's transfer did; the route turns it into the API's message. */
interface TransferOutcome {
  job: Job;
  newJob: Job | null;
  skipped: SkippedTask[];
}

/** "14 Nov 2026", as the API writes dates in its messages. */
function dayLabel(key: string): string {
  return new Date(`${key}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function transferJob(d: MockDb, job: Job, r: TransferJobRequest): TransferOutcome {
  if (!isOpenJob(job.status)) throw bad(`${job.jobCode} is ${job.status.toLowerCase()} and cannot be transferred.`);
  requirePermission(d, job, 'canTransfer', 'transfer it');
  if (!r.remarks?.trim() || r.remarks.trim().length < 3) throw bad('A reason is required for a transfer.');
  const o = officerOr400(d, r.assigneeId);
  if (o.id === job.assigneeId) throw bad(`${o.name} already holds this job.`);
  checkAssignable(o);
  const pending = job.tasks.filter((t) => t.status === 'Pending');
  if (!pending.length) throw bad('There are no pending tasks to transfer.');
  const now = new Date();
  const from = job.assigneeName;

  const ids = r.taskIds?.length ? r.taskIds : null;
  const requested = ids ? pending.filter((t) => ids.includes(t.id)) : pending;
  if (ids && requested.length !== ids.length) throw bad('Only pending tasks of this job can be transferred.');

  // Same person, same place, same task type, overlapping dates: that task stays here.
  const skipped: SkippedTask[] = [];
  const window: [string, string] = [toDateKey(now), r.endDate || job.endDate];
  const moving = requested.filter((t) => {
    const dup = duplicateCheck(o.id, t.taskType, window, pendingElsewhere(d, { type: t.taskType, target: t.target }, job.id));
    if (dup.block) skipped.push({ title: t.taskTitle, reason: cap(dup.block) });
    return !dup.block;
  });
  if (!moving.length) throw bad(`Nothing to transfer: ${o.name} already has ${requested.length > 1 ? 'these tasks' : 'this task'} pending (${skipped.map((s) => s.reason).join('; ')}).`);

  // Completed tasks stay with whoever did them (their route and allowance depend on it). So the job itself
  // only changes hands while nothing is done and every pending task moves; otherwise they go to a new linked job.
  const whole = job.doneCount === 0 && moving.length === pending.length;
  if (whole) {
    checkBranches(d, o, job.organisationUnitIds);
    setAssignee(job, o);
    refreshJob(job);
    pushHistory(d, job, 'Transferred', d.currentUser, now, { fromAssigneeName: from, toAssigneeName: o.name, taskNos: pending.map((t) => t.taskNo), remarks: r.remarks.trim() });
    return { job: out(d, job), newJob: null, skipped };
  }

  checkBranches(d, o, [...new Set(moving.map((t) => t.target.organisationUnitId))]);
  if (r.endDate && r.endDate < toDateKey()) throw bad('The new complete-by date cannot be in the past.');

  const target = newJob(d, { title: `${job.jobTitle} (from ${job.jobCode})`, description: job.jobDescription, creator: { ...d.currentUser, unitName: o.unitName }, assignee: o, startFrom: toDateKey(now), completeBy: r.endDate || job.endDate, createdAt: now });
  target.transferJobRefId = job.id;
  target.transferJobRefCode = job.jobCode;
  moving.forEach((t) => moveTask(d, t, job, target, now));
  refreshJob(target);
  refreshJob(job);
  d.jobs.unshift(target);
  const remarks = r.remarks.trim();
  pushHistory(d, job, 'TasksTransferredOut', d.currentUser, now, { fromAssigneeName: from, toAssigneeName: o.name, taskNos: moving.map((t) => t.taskNo), relatedJobId: target.id, relatedJobCode: target.jobCode, remarks });
  pushHistory(d, target, 'Created', d.currentUser, now, { toAssigneeName: o.name, remarks: `Created by a partial transfer from ${job.jobCode}` });
  pushHistory(d, target, 'TasksTransferredIn', d.currentUser, now, { fromAssigneeName: from, toAssigneeName: o.name, taskNos: target.tasks.map((t) => t.taskNo), relatedJobId: job.id, relatedJobCode: job.jobCode, remarks });
  return { job: out(d, job), newJob: out(d, target), skipped };
}

function extendJob(d: MockDb, job: Job, r: ExtendJobRequest): Job {
  if (!isOpenJob(job.status)) throw bad(`${job.jobCode} is ${job.status.toLowerCase()}.`);
  requirePermission(d, job, 'canUpdate', 'change its date');
  validateDate(r.endDate, 'New complete-by date');
  if (r.endDate <= job.endDate) throw bad('The new date must be later than the current one.');
  if (r.endDate < toDateKey()) throw bad('The new date cannot be in the past.');
  if (!r.remarks?.trim()) throw bad('A reason is required.');
  const old = job.endDate;
  job.endDate = r.endDate;
  refreshJob(job);
  pushHistory(d, job, 'DateExtended', d.currentUser, new Date(), { oldCompleteBy: old, newCompleteBy: r.endDate, remarks: r.remarks.trim() });
  return out(d, job);
}

function cancelJob(d: MockDb, job: Job, r: RemarksRequest): Job {
  if (!isOpenJob(job.status)) throw bad(`${job.jobCode} is ${job.status.toLowerCase()} and cannot be cancelled.`);
  requirePermission(d, job, 'canCancel', 'cancel it');
  if (!r.remarks?.trim()) throw bad('A reason is required.');
  const pending = job.tasks.filter((t) => t.status === 'Pending');
  pending.forEach((t) => {
    t.status = 'Cancelled';
    t.taskCancelReason = 'Job cancelled';
  });
  // Tasks already done stay completed and credited; the job itself is closed.
  refreshJob(job);
  job.status = 'Cancelled';
  pushHistory(d, job, 'Cancelled', d.currentUser, new Date(), { taskNos: pending.map((t) => t.taskNo), remarks: r.remarks.trim() });
  return out(d, job);
}

function closeTask(d: MockDb, job: Job, taskId: string, action: string, r: RemarksRequest): Job {
  const task = job.tasks.find((t) => t.id === taskId);
  if (!task) throw new MockError(404, 'Task not found');
  requirePermission(d, job, 'canUpdate', `${action} its tasks`);
  if (task.status !== 'Pending') throw bad(`${task.taskNo} is ${task.status.toLowerCase()}.`);
  if (!r.remarks?.trim()) throw bad('A reason is required.');
  if (action === 'reject' && task.origin !== 'SelfAdded') throw bad('Only tasks added from the mobile app can be rejected. Cancel it instead.');
  if (action !== 'reject' && action !== 'cancel') throw new MockError(404, 'Unknown action');
  task.status = action === 'reject' ? 'Rejected' : 'Cancelled';
  task.taskCancelReason = r.remarks.trim();
  refreshJob(job);
  pushHistory(d, job, action === 'reject' ? 'TaskRejected' : 'TaskCancelled', d.currentUser, new Date(), { taskNos: [task.taskNo], remarks: r.remarks.trim() });
  if (job.status === 'Completed') pushHistory(d, job, 'Completed', { id: 'system', name: 'System' }, new Date(), { remarks: 'No pending tasks left' });
  if (job.status === 'Cancelled') pushHistory(d, job, 'Cancelled', { id: 'system', name: 'System' }, new Date(), { remarks: 'No tasks left in the job' });
  return out(d, job);
}

/** The job has an OD member task (pending or completed) whose member's current DPD is in the range. */
function hasOdInDpdRange(d: MockDb, j: Job, range: JobSearchRequest['dpdRange']): boolean {
  if (!range) return true;
  return j.tasks.some((t) => {
    if (t.target.kind !== 'OdMember' || (t.status !== 'Pending' && t.status !== 'Completed')) return false;
    return inDpdRange(d.odMembers.find((c) => c.id === t.target.originRefId)?.dpd, range);
  });
}

function searchJobs(d: MockDb, r: JobSearchRequest): JobSearchResponse {
  const text = (r.searchText ?? '').toLowerCase().trim();
  const base = d.jobs.filter(
    (j) =>
      canSee(d, j) &&
      (!r.organisationUnitId || j.organisationUnitIds.includes(r.organisationUnitId)) &&
      (!r.assigneeId || j.assigneeId === r.assigneeId) &&
      (!r.dueFrom || j.endDate >= r.dueFrom) &&
      (!r.dueTo || j.endDate <= r.dueTo) &&
      hasOdInDpdRange(d, j, r.dpdRange) &&
      (!text ||
        [j.jobCode, j.jobTitle, j.assigneeName, j.createdByName, ...j.tasks.flatMap((t) => [t.taskNo, t.target.targetName])].some((v) => v.toLowerCase().includes(text))),
  );
  const filtered = base.filter((j) => (r.status ? j.status === r.status : !r.openOnly || isOpenJob(j.status)));
  const dir = r.sortDirection === 'desc' ? -1 : 1;
  const value = (j: Job) => (r.sortOn === 'assigneeName' ? j.assigneeName : r.sortOn === 'status' ? j.status : r.sortOn === 'createdOn' ? j.createdOn : j.endDate);
  const sorted = [...filtered].sort((a, b) => value(a).localeCompare(value(b)) * dir || a.jobCode.localeCompare(b.jobCode));
  const count = (s: Job['status']) => base.filter((j) => j.status === s).length;
  return {
    jobs: sorted.slice(r.pageIndex * r.pageSize, (r.pageIndex + 1) * r.pageSize).map(summary),
    totalRecords: filtered.length,
    summary: { total: base.length, assigned: count('Assigned'), inProgress: count('InProgress'), delayed: count('Delayed'), completed: count('Completed') },
  };
}

/** Task locations for the monitoring overview. pendingOnly defaults to true. */
function taskPoints(d: MockDb, q: URLSearchParams): JobTaskPoint[] {
  const branchId = q.get('organisationUnitId');
  const assigneeId = q.get('assigneeId');
  const pendingOnly = q.get('pendingOnly') !== 'false';
  return d.jobs
    .filter((j) => isOpenJob(j.status) && canSee(d, j) && (!assigneeId || j.assigneeId === assigneeId))
    .flatMap((j) =>
      j.tasks
        .filter((t) => (pendingOnly ? t.status === 'Pending' : t.status === 'Pending' || t.status === 'Completed') && (!branchId || t.target.organisationUnitId === branchId))
        .map((t) => ({
          jobId: j.id, jobCode: j.jobCode, jobTitle: j.jobTitle, jobStatus: j.status, jobStartDate: j.startDate ?? dayOf(j.createdOn), jobEndDate: j.endDate, assigneeId: j.assigneeId, assigneeName: j.assigneeName,
          taskId: t.id, taskNo: t.taskNo, taskTitle: t.taskTitle, taskType: t.taskType, priority: t.priority, status: t.status, targetKind: t.target.kind, originRefId: t.target.originRefId,
          organisationUnitId: t.target.organisationUnitId, targetLocation: t.target.targetLocation,
          locationMismatch: t.verification?.locationMatched === false,
        }) satisfies JobTaskPoint),
    );
}

/**
 * Open jobs for the "add to existing job" picker: only jobs the caller may add tasks to.
 * branchId = jobs that may take tasks of that branch.
 */
function openJobs(d: MockDb, assigneeId: string | null, branchId: string | null): JobSummary[] {
  return d.jobs
    .filter((j) => isOpenJob(j.status) && canSee(d, j) && permissionsOf(d, j).canUpdate && (!assigneeId || j.assigneeId === assigneeId))
    .filter((j) => {
      if (!branchId) return true;
      const o = d.officers.find((x) => x.id === j.assigneeId);
      return !!o && !jobBranchConflict(o, [...new Set([...j.organisationUnitIds, branchId])]);
    })
    .sort((a, b) => a.endDate.localeCompare(b.endDate))
    .map(summary);
}

// ---------------------------------------------------------------------------------------------
// OD members
// ---------------------------------------------------------------------------------------------

function followUpOf(d: MockDb, c: OdMember): OdFollowUpSummary | null {
  let best: OdFollowUpSummary | null = null;
  let bestAt = '';
  d.jobs.forEach((j) =>
    j.tasks
      .filter((t) => t.taskType === 'OdFollowUp' && t.target.originRefId === c.id && t.status !== 'Transferred')
      .forEach((t) => {
        const rank = (t.status === 'Pending' ? '2' : '1') + (t.taskCompletedOn ?? t.taskAddedOn);
        if (rank > bestAt) {
          bestAt = rank;
          best = { jobId: j.id, jobNo: j.jobCode, jobStatus: j.status, taskId: t.id, taskNo: t.taskNo, assigneeName: j.assigneeName, assigneeRole: j.assigneeRole, completeBy: j.endDate, status: t.status, outcome: t.odOutcome };
        }
      }),
  );
  return best;
}

/** Pending OD follow-ups of a member, one per open job (several people may hold one since Nov 2026). */
function pendingFollowUps(d: MockDb, memberId: string): OdMember['pendingWith'] {
  return d.jobs
    .filter((j) => isOpenJob(j.status))
    .flatMap((j) =>
      j.tasks
        .filter((t) => t.taskType === 'OdFollowUp' && t.target.originRefId === memberId && t.status === 'Pending')
        .map((t) => ({ jobId: j.id, jobNo: j.jobCode, taskNo: t.taskNo, assigneeId: j.assigneeId, assigneeName: j.assigneeName })),
    );
}

function searchOverdue(d: MockDb, r: OdMemberSearchRequest): OdMemberSearchResponse {
  const text = (r.searchText ?? '').toLowerCase().trim();
  const rows = d.odMembers.map((c) => ({ ...c, locationVerified: locationVerified(d, 'OdMember', c.id), followUp: followUpOf(d, c), pendingWith: pendingFollowUps(d, c.id) }));
  const filtered = rows.filter(
    (c) =>
      inScope(viewer, [c.branchId]) &&
      (!r.branchId || c.branchId === r.branchId) &&
      inDpdRange(c.dpd, r.dpdRange) &&
      (!r.creditOfficerId || c.creditOfficerId === r.creditOfficerId) &&
      (!r.groupId || c.groupId === r.groupId) &&
      (!r.onlyUnassigned || c.followUp?.status !== 'Pending') &&
      (!text || [c.memberName, c.loanAccountNo, c.groupName ?? '', c.creditOfficerName ?? ''].some((v) => v.toLowerCase().includes(text))),
  );
  const dir = r.sortDirection === 'desc' ? -1 : 1;
  const sorted = [...filtered].sort((a, b) => {
    if (r.sortOn === 'memberName') return a.memberName.localeCompare(b.memberName) * dir;
    if (r.sortOn === 'overdueAmount') return (a.overdueAmount - b.overdueAmount) * dir;
    return (a.dpd - b.dpd) * dir;
  });
  return {
    members: sorted.slice(r.pageIndex * r.pageSize, (r.pageIndex + 1) * r.pageSize),
    totalRecords: filtered.length,
    totalOverdueAmount: filtered.reduce((s, c) => s + c.overdueAmount, 0),
  };
}

function addOdToJob(d: MockDb, r: AddOdToJobRequest): AddOdToJobResponse {
  if (!r.members?.length) throw bad('Select at least one member.');
  if (!!r.jobId === !!r.newJob) throw bad('Choose an existing job or describe a new one.');

  const skipped: AddOdToJobResponse['skipped'] = [];
  const inputs: { input: NewTaskInput; memberId: string }[] = [];
  r.members.forEach((m) => {
    const id = m.memberId;
    const c = d.odMembers.find((x) => x.id === id);
    if (!c) return skipped.push({ memberId: id, reason: 'Member not found' });
    if (!c.homeLocation) return skipped.push({ memberId: id, reason: `${c.memberName}: home is not geo-tagged` });
    if (!locationVerified(d, 'OdMember', c.id)) return skipped.push({ memberId: id, reason: `${c.memberName}: ${LOCATION_NOT_VERIFIED.toLowerCase()}` });
    // Pending with the same person → skipped; with someone else → added with a warning (both in addTasks).
    inputs.push({
      memberId: id,
      input: {
        taskType: 'OdFollowUp',
        taskTitle: `OD follow-up – ${c.memberName}`,
        notes: [`Overdue ₹${c.overdueAmount.toLocaleString('en-IN')} · ${c.dpd} DPD.`, m.notes?.trim()].filter(Boolean).join(' '),
        priority: m.priority || 'Medium',
        coOrdinatedBy: m.accompaniedById ?? null,
        target: { kind: 'OdMember', originRefId: c.id, targetName: c.memberName, targetLocation: c.homeLocation, organisationUnitId: c.branchId, branchName: c.branchName, radiusMeters: d.settings.locationMatchRadiusMeters },
      },
    });
    return undefined;
  });

  // Branch rule: CO / ABM / BM jobs only take their own branch's members.
  let assignee: FieldOfficer;
  let job: Job | undefined;
  if (r.jobId) {
    job = d.jobs.find((j) => j.id === r.jobId);
    if (!job || !canSee(d, job)) throw new MockError(404, 'Job not found');
    if (!isOpenJob(job.status)) throw bad(`${job.jobCode} is ${job.status.toLowerCase()}; pick an open job.`);
    requirePermission(d, job, 'canUpdate', 'add tasks to it');
    assignee = officerOr400(d, job.assigneeId);
  } else {
    if (!r.newJob!.title?.trim()) throw bad('Job title is required.');
    validateDate(r.newJob!.completeBy, 'Complete-by date');
    if (r.newJob!.completeBy < toDateKey()) throw bad('The complete-by date cannot be in the past.');
    if (!viewer.canCreateJobs) throw forbidden('There is nobody below you to give a job to.');
    if (!r.newJob!.assigneeId) throw bad('Select who will do this job.');
    assignee = officerOr400(d, r.newJob!.assigneeId);
    checkAssignable(assignee);
  }
  const allowed = inputs.filter(({ input, memberId }) => {
    const conflict = jobBranchConflict(assignee, [...new Set([...(job?.organisationUnitIds ?? []), input.target.organisationUnitId])], branchName(d));
    if (conflict) skipped.push({ memberId, reason: `${input.target.targetName}: ${conflict}` });
    return !conflict;
  });
  if (!allowed.length) throw bad(`Nothing to add. ${skipped.map((s) => s.reason).join(' · ')}`);

  const now = new Date();
  if (!job) {
    const h = r.newJob!;
    job = newJob(d, { title: h.title.trim(), description: h.description?.trim() || null, creator: { ...d.currentUser, unitName: viewer.unitName }, assignee, startFrom: h.startFrom, completeBy: h.completeBy, createdAt: now });
    d.jobs.unshift(job);
  }
  const before = new Set(job.tasks.map((t) => t.id));
  const isNew = job.tasks.length === 0;
  let res: AddTasksResponse;
  try {
    res = addTasks(d, job, allowed.map((a) => a.input), isNew ? 'Created' : 'TasksAdded', isNew);
  } catch (e) {
    if (isNew) d.jobs.splice(d.jobs.indexOf(job), 1);
    throw e;
  }
  const memberOf = (title: string) => allowed.find((a) => a.input.taskTitle === title)?.memberId ?? '';
  res.skipped.forEach((s) => skipped.push({ memberId: memberOf(s.title), reason: `${s.title}: ${s.reason}` }));
  const warnings = res.warnings.map((w) => ({ memberId: memberOf(w.title), reason: `${w.title}: ${w.reason}` }));
  if (isNew && !job.tasks.length) {
    d.jobs.splice(d.jobs.indexOf(job), 1);
    throw bad(`Nothing to add. ${skipped.map((s) => s.reason).join(' · ')}`);
  }
  if (isNew) {
    pushHistory(d, job, 'Created', d.currentUser, now, { toAssigneeName: assignee.name, taskNos: job.tasks.map((t) => t.taskNo), remarks: 'Created from the OD Members screen' });
  }
  return { job: out(d, job), addedTaskIds: job.tasks.filter((t) => !before.has(t.id)).map((t) => t.id), skipped, warnings };
}

// ---------------------------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------------------------

function inRange(dateKey: string, from: string | null, to: string | null) {
  return (!from || dateKey >= from) && (!to || dateKey <= to);
}

function searchAlerts(d: MockDb, r: AlertSearchRequest): AlertSearchResponse {
  const filtered = d.alerts.filter(
    (a) =>
      (!r.status || a.status === r.status) &&
      (!r.type || a.type === r.type) &&
      (!r.severity || a.severity === r.severity) &&
      (!r.branchId || a.branchId === r.branchId) &&
      (!r.employeeId || a.employeeId === r.employeeId) &&
      inRange(toDateKey(new Date(a.raisedAt)), r.fromDate, r.toDate),
  );
  const openByType = {} as Record<AlertType, number>;
  (['NearHome', 'GpsOff', 'Stationary', 'OutsideBranchRadius', 'LocationMismatch', 'DelayedJob'] as AlertType[]).forEach(
    (t) => (openByType[t] = d.alerts.filter((a) => a.type === t && a.status === 'Open' && (!r.branchId || a.branchId === r.branchId)).length),
  );
  return {
    alerts: filtered.slice(r.pageIndex * r.pageSize, (r.pageIndex + 1) * r.pageSize),
    totalRecords: filtered.length,
    openByType,
  };
}
