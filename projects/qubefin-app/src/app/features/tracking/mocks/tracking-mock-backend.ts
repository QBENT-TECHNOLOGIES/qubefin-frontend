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
  AddTasksRequest,
  AddTasksResponse,
  AssignJobRequest,
  CreateJobRequest,
  ExtendJobRequest,
  Job,
  JobPermissions,
  JobSearchRequest,
  JobSearchResponse,
  JobSummary,
  JobTaskPoint,
  NewTaskInput,
  RemarksRequest,
  SkippedTask,
  TransferJobRequest,
  TransferJobResponse,
} from '../models/job';
import {
  AddOdToJobRequest,
  AddOdToJobResponse,
  OdFollowUpSummary,
  OdMember,
  OdMemberSearchRequest,
  OdMemberSearchResponse,
} from '../models/od-member';
import { FieldOfficer, TrackingViewer } from '../models/field-officer';
import { AlertSearchRequest, AlertSearchResponse, AlertType, ResolveAlertRequest } from '../models/tracking-alert';
import { ApprovalDecisionRequest } from '../models/approval-request';
import { GeoTagKind, GeoTagPoint, GeoTagPointsResponse, UpdateGeoTagRequest } from '../models/geo-tag';
import { TrackingSettings } from '../models/tracking-settings';
import { MOCK_ACTOR_KEY } from './mock-actor-key';
import { toDateKey } from '../utils/geo-utils';
import { LOCATION_NOT_VERIFIED, ROLE_RANK, canAssignWorkTo, inScope, isBelow, isOpenJob, jobBranchConflict, needsVerifiedLocation, targetKey } from '../utils/job-rules';
import { inDpdRange } from '../utils/dpd';
import { ROLE_LABEL, TASK_TYPE } from '../utils/tracking-labels';

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
    return { id: ADMIN_USER.id, employeeId: null, name: ADMIN_USER.name, role: 'Admin', unitName: 'All branches', branchIds: d.branches.map((b) => b.id), canCreateJobs: true };
  }
  d.currentUser = { id: o.id, name: o.name };
  const v = { role: o.role, branchIds: o.branchIds };
  return { id: o.id, employeeId: o.id, name: o.name, role: o.role, unitName: o.unitName, branchIds: o.branchIds, canCreateJobs: d.officers.some((x) => canAssignWorkTo(v, x)) };
}

/** Rank of whoever created a job (an officer, or an administrator). */
function rankOfPerson(d: MockDb, id: string): number {
  const o = d.officers.find((x) => x.id === id);
  return o ? ROLE_RANK[o.role] : ROLE_RANK.Admin;
}

/**
 * Jobs a user can see: everything for an Admin; their own jobs (created or assigned); jobs inside their
 * scope held by someone below them (a BM sees the jobs an AM gave to the COs of the branch); and
 * unassigned jobs inside their scope created by them or by someone below them.
 */
function canSee(d: MockDb, j: Job): boolean {
  if (viewer.role === 'Admin' || j.assigneeId === viewer.id || j.createdById === viewer.id) return true;
  if (!j.branchIds.length || !inScope(viewer, j.branchIds)) return false;
  return j.assigneeRole ? isBelow(j.assigneeRole, viewer.role) : ROLE_RANK[viewer.role] < rankOfPerson(d, j.createdById);
}

/**
 * Contract §3.3. Senior = the creator, or anyone above the creator in scope: may assign, transfer and cancel.
 * Managers above the assignee may also update (add tasks, extend, cancel / reject a task).
 * The assignee gets nothing on the web: no delegation, and own tasks are added from the mobile app.
 */
function permissionsOf(d: MockDb, j: Job): JobPermissions {
  const can = isOpenJob(j.status) && j.assigneeId !== viewer.id;
  const senior =
    viewer.role === 'Admin' || j.createdById === viewer.id || (ROLE_RANK[viewer.role] < rankOfPerson(d, j.createdById) && inScope(viewer, j.branchIds));
  const managesAssignee = !!j.assigneeRole && isBelow(j.assigneeRole, viewer.role) && inScope(viewer, j.branchIds);
  return {
    canAssign: can && !j.assigneeId && senior,
    canTransfer: can && !!j.assigneeId && j.openCount > 0 && senior,
    canCancel: can && senior,
    canUpdate: can && (senior || managesAssignee),
  };
}

/** Stamps the caller's permissions on a job before it is returned. */
function out(d: MockDb, j: Job): Job {
  j.permissions = permissionsOf(d, j);
  return j;
}

function requirePermission(d: MockDb, j: Job, key: keyof JobPermissions, what: string) {
  if (permissionsOf(d, j)[key]) return;
  if (!isOpenJob(j.status)) throw bad(`${j.jobNo} is ${j.status.toLowerCase()}.`);
  if (j.assigneeId === viewer.id) {
    throw forbidden(`${j.jobNo} is assigned to you, so you cannot ${what}. Work cannot be delegated; add tasks to your own job from the mobile app.`);
  }
  if (key === 'canUpdate') throw forbidden(`You can view ${j.jobNo} but not change it.`);
  throw forbidden(`Only the person who created ${j.jobNo} (${j.createdByName}) or someone above them can ${what}.`);
}

/** The caller may only give work to people below them in their own scope. */
function checkAssignable(o: FieldOfficer) {
  if (!canAssignWorkTo(viewer, o)) {
    throw forbidden(`${o.name} (${ROLE_LABEL[o.role]}, ${o.unitName}) is not below you in ${viewer.unitName}, so you cannot give them work.`);
  }
}

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
  if (m === 'GET' && path === 'me') {
    const { id: _id, ...me } = viewer;
    return me satisfies TrackingViewer;
  }
  if (m === 'GET' && path === 'branches') return d.branches.filter((b) => inScope(viewer, [b.id]));
  if (m === 'GET' && path === 'field-officers') {
    const branchId = q.get('branchId');
    return d.officers.filter((o) => canAssignWorkTo(viewer, o) && (!branchId || o.branchIds.includes(branchId)));
  }

  // ---- Jobs ------------------------------------------------------------------------------
  if (m === 'POST' && path === 'jobs/search') return searchJobs(d, body as JobSearchRequest);
  if (m === 'GET' && path === 'jobs/open') return openJobs(d, q.get('assigneeId'), q.get('branchId'));
  if (m === 'GET' && path === 'jobs/task-points') return taskPoints(d, q);
  if (m === 'POST' && path === 'jobs') return createJob(d, body as CreateJobRequest);
  if (seg[0] === 'jobs' && seg.length >= 2) {
    const job = d.jobs.find((j) => j.id === seg[1] && canSee(d, j));
    if (!job) throw new MockError(404, 'Job not found');
    if (m === 'GET' && seg.length === 2) return out(d, job);
    if (m === 'GET' && seg[2] === 'history') {
      return d.history.filter((h) => h.jobId === job.id).sort((a, b) => b.performedAt.localeCompare(a.performedAt) || b.id.localeCompare(a.id));
    }
    if (m === 'PUT' && seg[2] === 'assign') return assignJob(d, job, body as AssignJobRequest);
    if (m === 'PUT' && seg[2] === 'transfer') return transferJob(d, job, body as TransferJobRequest);
    if (m === 'PUT' && seg[2] === 'extend') return extendJob(d, job, body as ExtendJobRequest);
    if (m === 'PUT' && seg[2] === 'cancel') return cancelJob(d, job, body as RemarksRequest);
    if (m === 'POST' && seg[2] === 'tasks' && seg.length === 3) return addTasks(d, job, (body as AddTasksRequest).tasks, 'TasksAdded');
    if (m === 'PUT' && seg[2] === 'tasks' && seg.length === 5) return closeTask(d, job, seg[3], seg[4], body as RemarksRequest);
  }

  // ---- OD members -----------------------------------------------------------------
  if (m === 'POST' && path === 'od-members/search') return searchOverdue(d, body as OdMemberSearchRequest);
  if (m === 'POST' && path === 'od-members/add-to-job') return addOdToJob(d, body as AddOdToJobRequest);

  // ---- Live ------------------------------------------------------------------------------
  if (m === 'GET' && path === 'live/positions') {
    const branchId = q.get('branchId');
    return simulateLivePositions().filter((p) => !branchId || p.branchId === branchId);
  }
  if (m === 'GET' && seg[0] === 'employees' && seg[2] === 'route') {
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
    return d.approvals.filter((a) => !status || a.status === status);
  }
  if (m === 'PUT' && seg[0] === 'approvals' && seg[2] === 'decision') {
    const req2 = d.approvals.find((a) => a.id === seg[1]);
    if (!req2) throw new MockError(404, 'Request not found');
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
    const branchId = q.get('branchId');
    const all = d.geoTags.filter((g) => kinds.includes(g.kind) && (!branchId || g.branchId === branchId));
    const od = new Map(d.odMembers.map((c) => [c.id, c]));
    const untaggedByKind: Partial<Record<GeoTagKind, number>> = {};
    all.filter((g) => !g.location).forEach((g) => (untaggedByKind[g.kind] = (untaggedByKind[g.kind] ?? 0) + 1));
    const points: GeoTagPoint[] = all
      .filter((g) => !!g.location)
      .map((g) => {
        const c = g.kind === 'OdMember' ? od.get(g.refId) : undefined;
        return {
          id: g.id, kind: g.kind, refId: g.refId, name: g.name, refCode: g.refCode, branchId: g.branchId, branchName: g.branchName,
          address: g.address, location: g.location!, radiusMeters: g.radiusMeters, verified: g.verified, dpd: c?.dpd ?? null, overdueAmount: c?.overdueAmount ?? null,
        };
      });
    return { points, untaggedByKind } satisfies GeoTagPointsResponse;
  }
  if (m === 'GET' && path === 'geo-tags') {
    const kind = (q.get('kind') ?? 'Branch') as GeoTagKind;
    const text = (q.get('searchText') ?? '').toLowerCase().trim();
    const branchIds = (q.get('branchIds') ?? q.get('branchId') ?? '').split(',').filter(Boolean);
    const onlyUntagged = q.get('onlyUntagged') === 'true';
    return d.geoTags.filter(
      (g) =>
        g.kind === kind &&
        (!branchIds.length || branchIds.includes(g.branchId)) &&
        (!onlyUntagged || !g.location) &&
        (!text || g.name.toLowerCase().includes(text) || g.refCode.toLowerCase().includes(text)),
    );
  }
  if (m === 'PUT' && seg[0] === 'geo-tags' && seg.length === 2) {
    const tag = d.geoTags.find((g) => g.id === seg[1]);
    if (!tag) throw new MockError(404, 'Geo-tag not found');
    const r = body as UpdateGeoTagRequest;
    if (!r.reason?.trim()) throw bad('A reason is required when changing a location.');
    tag.location = r.location;
    tag.radiusMeters = r.radiusMeters;
    // Groups / members are verified from the mobile app: a location changed on the web needs verifying again.
    tag.verified = !needsVerifiedLocation(tag.kind);
    tag.taggedByName = d.currentUser.name;
    tag.taggedAt = new Date().toISOString();
    tag.history.unshift({ location: r.location, radiusMeters: r.radiusMeters, changedByName: d.currentUser.name, changedAt: tag.taggedAt, reason: r.reason });
    if (tag.kind === 'Branch') {
      const b = d.branches.find((x) => x.id === tag.refId);
      if (b) b.location = r.location;
    }
    if (tag.kind === 'GroupCentre') {
      const g = d.groups.find((x) => x.id === tag.refId);
      if (g) g.location = r.location;
    }
    if (tag.kind === 'EmployeeHome') {
      const o = d.officers.find((x) => x.id === tag.refId);
      if (o) o.homeLocation = r.location;
    }
    if (tag.kind === 'OdMember') {
      const c = d.odMembers.find((x) => x.id === tag.refId);
      if (c) c.homeLocation = r.location;
    }
    if (tag.kind === 'Member') {
      const c = d.members.find((x) => x.id === tag.refId);
      if (c) c.location = r.location;
    }
    return tag;
  }

  // ---- Settings --------------------------------------------------------------------------
  if (m === 'GET' && path === 'settings') return d.settings;
  if (m === 'PUT' && path === 'settings') {
    const s = body as TrackingSettings;
    if (s.homeRadiusMeters <= 0 || s.stationaryMinutes <= 0 || s.branchRadiusKm <= 0 || s.stopMinMinutes <= 0 || s.stopRadiusMeters <= 0) {
      throw bad('Thresholds must be greater than zero.');
    }
    d.settings = { ...s, lastModifiedByName: d.currentUser.name, lastModifiedAt: new Date().toISOString() };
    d.branches.forEach((b) => (b.operatingRadiusKm = s.branchRadiusKm));
    return d.settings;
  }

  return NOT_FOUND;
}

// ---------------------------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------------------------

function summary(j: Job): JobSummary {
  const { tasks: _t, description: _d, createdById: _c, permissions: _p, ...rest } = j;
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
function windowOf(j: Pick<Job, 'startFrom' | 'createdAt' | 'completeBy'>): [string, string] {
  const start = j.startFrom ?? dayOf(j.createdAt);
  const today = toDateKey();
  return [start, j.completeBy < today ? today : j.completeBy];
}

/**
 * Conflict rule: the same place cannot have the same type of task pending in two open jobs whose
 * date windows overlap (so next week's centre meeting is fine, a second one this week is not).
 */
function pendingDuplicate(d: MockDb, t: NewTaskInput, window: [string, string]): { jobNo: string; taskNo: string } | null {
  const key = targetKey(t.type, t.target);
  for (const j of d.jobs) {
    if (!isOpenJob(j.status)) continue;
    const [s, e] = windowOf(j);
    if (s > window[1] || window[0] > e) continue;
    const hit = j.tasks.find((x) => x.status === 'Pending' && targetKey(x.type, x.target) === key);
    if (hit) return { jobNo: j.jobNo, taskNo: hit.taskNo };
  }
  return null;
}

/** Groups, members and OD members can only be put in a job once their location is verified (from the mobile app). */
function locationVerified(d: MockDb, kind: string, refId: string | null): boolean {
  if (!needsVerifiedLocation(kind) || !refId) return true;
  return !!d.geoTags.find((g) => g.kind === kind && g.refId === refId)?.verified;
}

function validateTaskInput(t: NewTaskInput): string | null {
  if (!t.title?.trim()) return 'Title is required.';
  if (!TASK_TYPE[t.type]) return 'Unknown task type.';
  if (!t.target?.location || typeof t.target.location.lat !== 'number') return 'Every task needs a location.';
  if (!t.target.branchId) return 'The task location must belong to a branch.';
  return null;
}

/** Adds tasks, skipping (not failing) duplicates; the branch rule fails the whole request. */
function addTasks(d: MockDb, job: Job, tasks: NewTaskInput[], action: 'TasksAdded' | 'Created', silent = false): AddTasksResponse {
  if (!isOpenJob(job.status) && action === 'TasksAdded') throw bad(`${job.jobNo} is ${job.status.toLowerCase()}; tasks can no longer be added.`);
  if (action === 'TasksAdded') requirePermission(d, job, 'canUpdate', 'add tasks to it');
  if (!tasks?.length) throw bad('Add at least one task.');
  tasks.forEach((t) => {
    const err = validateTaskInput(t);
    if (err) throw bad(`${t.title || 'Task'}: ${err}`);
  });
  const outside = tasks.find((t) => !inScope(viewer, [t.target.branchId]));
  if (outside) throw forbidden(`${outside.target.branchName} is outside your ${viewer.unitName}.`);
  if (job.assigneeId) {
    const officer = officerOr400(d, job.assigneeId);
    checkBranches(d, officer, [...new Set([...job.branchIds, ...tasks.map((t) => t.target.branchId)])]);
  }

  const skipped: SkippedTask[] = [];
  const seen = new Set<string>();
  const now = new Date();
  const added: string[] = [];
  tasks.forEach((t) => {
    const key = targetKey(t.type, t.target);
    if (seen.has(key)) return skipped.push({ title: t.title, reason: 'Listed twice in this request' });
    seen.add(key);
    if (!locationVerified(d, t.target.kind, t.target.refId)) return skipped.push({ title: t.title, reason: LOCATION_NOT_VERIFIED });
    const dup = pendingDuplicate(d, t, windowOf(job));
    if (dup) return skipped.push({ title: t.title, reason: `Already pending as ${dup.taskNo} in ${dup.jobNo}` });
    const created = newTask(d, job, { type: t.type, title: t.title.trim(), notes: t.notes?.trim() || null, target: t.target, origin: 'Assigned', addedBy: d.currentUser, addedAt: now });
    added.push(created.taskNo);
    return undefined;
  });
  refreshJob(job);
  if (added.length && !silent) pushHistory(d, job, action, d.currentUser, now, { taskNos: added });
  return { job: out(d, job), skipped };
}

function createJob(d: MockDb, r: CreateJobRequest): AddTasksResponse {
  if (!r.title?.trim()) throw bad('Job title is required.');
  validateDate(r.completeBy, 'Complete-by date');
  if (r.completeBy < toDateKey()) throw bad('The complete-by date cannot be in the past.');
  if (r.startFrom && r.startFrom > r.completeBy) throw bad('Start date must be on or before the complete-by date.');
  if (!r.tasks?.length) throw bad('A job needs at least one task.');
  if (!viewer.canCreateJobs) throw forbidden('There is nobody below you to give a job to.');
  const assignee = r.assigneeId ? officerOr400(d, r.assigneeId) : null;
  if (assignee) checkAssignable(assignee);
  if (assignee) checkBranches(d, assignee, [...new Set(r.tasks.map((t) => t.target.branchId))]);

  const now = new Date();
  const job = newJob(d, { title: r.title.trim(), description: r.description?.trim() || null, creator: { ...d.currentUser, unitName: viewer.unitName }, assignee, startFrom: r.startFrom, completeBy: r.completeBy, createdAt: now });
  if (assignee) job.unitName = assignee.unitName;
  const res = addTasks(d, job, r.tasks, 'Created', true);
  if (!job.tasks.length) {
    d.counters.job--;
    throw bad(`No task could be added: ${res.skipped.map((s) => `${s.title} – ${s.reason}`).join('; ')}`);
  }
  if (!assignee) {
    // Unit of an unassigned job = the branch its tasks are in, if just one.
    job.unitName = job.branchNames.length === 1 ? job.branchNames[0] : 'Several branches';
  }
  d.jobs.unshift(job);
  pushHistory(d, job, 'Created', d.currentUser, now, { toAssigneeName: assignee?.name ?? null, taskNos: job.tasks.map((t) => t.taskNo), remarks: assignee ? null : 'Created without an assignee' });
  return { ...res, job: out(d, job) };
}

function setAssignee(job: Job, o: FieldOfficer) {
  job.assigneeId = o.id;
  job.assigneeName = o.name;
  job.assigneeRole = o.role;
  job.unitName = o.unitName;
}

function assignJob(d: MockDb, job: Job, r: AssignJobRequest): Job {
  if (job.assigneeId) throw bad(`${job.jobNo} is already assigned to ${job.assigneeName}. Use Transfer instead.`);
  if (!isOpenJob(job.status)) throw bad(`${job.jobNo} is ${job.status.toLowerCase()}.`);
  requirePermission(d, job, 'canAssign', 'assign it');
  const o = officerOr400(d, r.assigneeId);
  checkAssignable(o);
  checkBranches(d, o, job.branchIds);
  setAssignee(job, o);
  refreshJob(job);
  pushHistory(d, job, 'Assigned', d.currentUser, new Date(), { toAssigneeName: o.name, remarks: r.remarks || null });
  return out(d, job);
}

function transferJob(d: MockDb, job: Job, r: TransferJobRequest): TransferJobResponse {
  if (!job.assigneeId) throw bad(`${job.jobNo} is not assigned yet. Use Assign instead.`);
  if (!isOpenJob(job.status)) throw bad(`${job.jobNo} is ${job.status.toLowerCase()} and cannot be transferred.`);
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
  // Completed tasks stay with whoever did them (their route and allowance depend on it). So the job itself
  // only changes hands while nothing is done; after that, the pending tasks move to a new linked job.
  const whole = job.doneCount === 0 && (!ids || ids.length === pending.length);
  if (whole) {
    checkBranches(d, o, job.branchIds);
    setAssignee(job, o);
    refreshJob(job);
    pushHistory(d, job, 'Transferred', d.currentUser, now, { fromAssigneeName: from, toAssigneeName: o.name, taskNos: pending.map((t) => t.taskNo), remarks: r.remarks.trim() });
    return { job: out(d, job), newJob: null };
  }

  const moving = ids ? pending.filter((t) => ids.includes(t.id)) : pending;
  if (ids && moving.length !== ids.length) throw bad('Only pending tasks of this job can be transferred.');
  checkBranches(d, o, [...new Set(moving.map((t) => t.target.branchId))]);
  if (r.completeBy && r.completeBy < toDateKey()) throw bad('The new complete-by date cannot be in the past.');

  const target = newJob(d, { title: `${job.title} (from ${job.jobNo})`, description: job.description, creator: { ...d.currentUser, unitName: o.unitName }, assignee: o, startFrom: toDateKey(now), completeBy: r.completeBy || job.completeBy, createdAt: now });
  target.transferredFromJobId = job.id;
  target.transferredFromJobNo = job.jobNo;
  moving.forEach((t) => moveTask(d, t, job, target, now));
  refreshJob(target);
  refreshJob(job);
  d.jobs.unshift(target);
  const remarks = r.remarks.trim();
  pushHistory(d, job, 'TasksTransferredOut', d.currentUser, now, { fromAssigneeName: from, toAssigneeName: o.name, taskNos: moving.map((t) => t.taskNo), relatedJobId: target.id, relatedJobNo: target.jobNo, remarks });
  pushHistory(d, target, 'Created', d.currentUser, now, { toAssigneeName: o.name, remarks: `Created by a partial transfer from ${job.jobNo}` });
  pushHistory(d, target, 'TasksTransferredIn', d.currentUser, now, { fromAssigneeName: from, toAssigneeName: o.name, taskNos: target.tasks.map((t) => t.taskNo), relatedJobId: job.id, relatedJobNo: job.jobNo, remarks });
  return { job: out(d, job), newJob: out(d, target) };
}

function extendJob(d: MockDb, job: Job, r: ExtendJobRequest): Job {
  if (!isOpenJob(job.status)) throw bad(`${job.jobNo} is ${job.status.toLowerCase()}.`);
  requirePermission(d, job, 'canUpdate', 'change its date');
  validateDate(r.completeBy, 'New complete-by date');
  if (r.completeBy <= job.completeBy) throw bad('The new date must be later than the current one.');
  if (r.completeBy < toDateKey()) throw bad('The new date cannot be in the past.');
  if (!r.remarks?.trim()) throw bad('A reason is required.');
  const old = job.completeBy;
  job.completeBy = r.completeBy;
  refreshJob(job);
  pushHistory(d, job, 'DateExtended', d.currentUser, new Date(), { remarks: `${old} → ${r.completeBy}: ${r.remarks.trim()}` });
  return out(d, job);
}

function cancelJob(d: MockDb, job: Job, r: RemarksRequest): Job {
  if (!isOpenJob(job.status)) throw bad(`${job.jobNo} is ${job.status.toLowerCase()} and cannot be cancelled.`);
  requirePermission(d, job, 'canCancel', 'cancel it');
  if (!r.remarks?.trim()) throw bad('A reason is required.');
  const pending = job.tasks.filter((t) => t.status === 'Pending');
  pending.forEach((t) => {
    t.status = 'Cancelled';
    t.closedReason = 'Job cancelled';
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
  task.closedReason = r.remarks.trim();
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
    return inDpdRange(d.odMembers.find((c) => c.id === t.target.refId)?.dpd, range);
  });
}

function searchJobs(d: MockDb, r: JobSearchRequest): JobSearchResponse {
  const text = (r.searchText ?? '').toLowerCase().trim();
  const base = d.jobs.filter(
    (j) =>
      canSee(d, j) &&
      (!r.branchId || j.branchIds.includes(r.branchId)) &&
      (!r.assigneeId || j.assigneeId === r.assigneeId) &&
      (!r.dueFrom || j.completeBy >= r.dueFrom) &&
      (!r.dueTo || j.completeBy <= r.dueTo) &&
      hasOdInDpdRange(d, j, r.dpdRange) &&
      (!text ||
        [j.jobNo, j.title, j.assigneeName ?? '', j.createdByName, ...j.tasks.flatMap((t) => [t.taskNo, t.target.name])].some((v) => v.toLowerCase().includes(text))),
  );
  const filtered = base.filter((j) => (r.status ? j.status === r.status : !r.openOnly || isOpenJob(j.status)));
  const dir = r.sortDirection === 'desc' ? -1 : 1;
  const value = (j: Job) => (r.sortOn === 'assigneeName' ? (j.assigneeName ?? '~') : r.sortOn === 'status' ? j.status : r.sortOn === 'createdAt' ? j.createdAt : j.completeBy);
  const sorted = [...filtered].sort((a, b) => value(a).localeCompare(value(b)) * dir || a.jobNo.localeCompare(b.jobNo));
  const count = (s: Job['status']) => base.filter((j) => j.status === s).length;
  return {
    jobs: sorted.slice(r.pageIndex * r.pageSize, (r.pageIndex + 1) * r.pageSize).map(summary),
    totalRecords: filtered.length,
    summary: { total: base.length, unassigned: count('Unassigned'), assigned: count('Assigned'), inProgress: count('InProgress'), delayed: count('Delayed'), completed: count('Completed') },
  };
}

/** Task locations for the monitoring overview. pendingOnly defaults to true. */
function taskPoints(d: MockDb, q: URLSearchParams): JobTaskPoint[] {
  const branchId = q.get('branchId');
  const assigneeId = q.get('assigneeId');
  const pendingOnly = q.get('pendingOnly') !== 'false';
  return d.jobs
    .filter((j) => isOpenJob(j.status) && canSee(d, j) && (!assigneeId || j.assigneeId === assigneeId))
    .flatMap((j) =>
      j.tasks
        .filter((t) => (pendingOnly ? t.status === 'Pending' : t.status === 'Pending' || t.status === 'Completed') && (!branchId || t.target.branchId === branchId))
        .map((t) => ({
          jobId: j.id, jobNo: j.jobNo, jobTitle: j.title, jobStatus: j.status, jobStartFrom: j.startFrom ?? dayOf(j.createdAt), jobCompleteBy: j.completeBy, assigneeId: j.assigneeId, assigneeName: j.assigneeName,
          taskId: t.id, taskNo: t.taskNo, title: t.title, type: t.type, status: t.status, targetKind: t.target.kind, refId: t.target.refId, location: t.target.location,
          locationMismatch: t.verification?.locationMatched === false,
        })),
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
      if (!j.assigneeId) return j.branchIds.includes(branchId);
      const o = d.officers.find((x) => x.id === j.assigneeId);
      return !!o && !jobBranchConflict(o, [...new Set([...j.branchIds, branchId])]);
    })
    .sort((a, b) => a.completeBy.localeCompare(b.completeBy))
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
      .filter((t) => t.type === 'OdFollowUp' && t.target.refId === c.id && t.status !== 'Transferred')
      .forEach((t) => {
        const rank = (t.status === 'Pending' ? '2' : '1') + (t.completedAt ?? t.addedAt);
        if (rank > bestAt) {
          bestAt = rank;
          best = { jobId: j.id, jobNo: j.jobNo, jobStatus: j.status, taskId: t.id, taskNo: t.taskNo, assigneeName: j.assigneeName, assigneeRole: j.assigneeRole, completeBy: j.completeBy, status: t.status, outcome: t.odOutcome };
        }
      }),
  );
  return best;
}

function searchOverdue(d: MockDb, r: OdMemberSearchRequest): OdMemberSearchResponse {
  const text = (r.searchText ?? '').toLowerCase().trim();
  const rows = d.odMembers.map((c) => ({ ...c, locationVerified: locationVerified(d, 'OdMember', c.id), followUp: followUpOf(d, c) }));
  const filtered = rows.filter(
    (c) =>
      inScope(viewer, [c.branchId]) &&
      (!r.branchId || c.branchId === r.branchId) &&
      inDpdRange(c.dpd, r.dpdRange) &&
      (!r.onlyUnassigned || c.followUp?.status !== 'Pending') &&
      (!text || [c.memberName, c.loanAccountNo, c.groupName ?? ''].some((v) => v.toLowerCase().includes(text))),
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
  if (!r.memberIds?.length) throw bad('Select at least one member.');
  if (!!r.jobId === !!r.newJob) throw bad('Choose an existing job or describe a new one.');

  const skipped: AddOdToJobResponse['skipped'] = [];
  const inputs: { input: NewTaskInput; memberId: string }[] = [];
  r.memberIds.forEach((id) => {
    const c = d.odMembers.find((x) => x.id === id);
    if (!c) return skipped.push({ memberId: id, reason: 'Member not found' });
    if (!c.homeLocation) return skipped.push({ memberId: id, reason: `${c.memberName}: home is not geo-tagged` });
    if (!locationVerified(d, 'OdMember', c.id)) return skipped.push({ memberId: id, reason: `${c.memberName}: ${LOCATION_NOT_VERIFIED.toLowerCase()}` });
    const f = followUpOf(d, c);
    if (f?.status === 'Pending') return skipped.push({ memberId: id, reason: `${c.memberName}: already pending as ${f.taskNo} in ${f.jobNo}` });
    inputs.push({
      memberId: id,
      input: {
        type: 'OdFollowUp',
        title: `OD follow-up – ${c.memberName}`,
        notes: [`Overdue ₹${c.overdueAmount.toLocaleString('en-IN')} · ${c.dpd} DPD.`, r.notes?.trim()].filter(Boolean).join(' '),
        target: { kind: 'OdMember', refId: c.id, name: c.memberName, address: c.address, location: c.homeLocation, branchId: c.branchId, branchName: c.branchName, matchRadiusMeters: d.settings.locationMatchRadiusMeters },
      },
    });
    return undefined;
  });

  // Branch rule: CO / ABM / BM jobs only take their own branch's members.
  let assignee: FieldOfficer | null = null;
  let job: Job | undefined;
  if (r.jobId) {
    job = d.jobs.find((j) => j.id === r.jobId);
    if (!job || !canSee(d, job)) throw new MockError(404, 'Job not found');
    if (!isOpenJob(job.status)) throw bad(`${job.jobNo} is ${job.status.toLowerCase()}; pick an open job.`);
    requirePermission(d, job, 'canUpdate', 'add tasks to it');
    assignee = job.assigneeId ? officerOr400(d, job.assigneeId) : null;
  } else {
    if (!r.newJob!.title?.trim()) throw bad('Job title is required.');
    validateDate(r.newJob!.completeBy, 'Complete-by date');
    if (r.newJob!.completeBy < toDateKey()) throw bad('The complete-by date cannot be in the past.');
    if (!viewer.canCreateJobs) throw forbidden('There is nobody below you to give a job to.');
    assignee = r.newJob!.assigneeId ? officerOr400(d, r.newJob!.assigneeId) : null;
    if (assignee) checkAssignable(assignee);
  }
  const allowed = inputs.filter(({ input, memberId }) => {
    const conflict = assignee ? jobBranchConflict(assignee, [...new Set([...(job?.branchIds ?? []), input.target.branchId])], branchName(d)) : null;
    if (conflict) skipped.push({ memberId, reason: `${input.target.name}: ${conflict}` });
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
  const res = addTasks(d, job, allowed.map((a) => a.input), isNew ? 'Created' : 'TasksAdded', isNew);
  res.skipped.forEach((s) => skipped.push({ memberId: allowed.find((a) => a.input.title === s.title)?.memberId ?? '', reason: `${s.title}: ${s.reason}` }));
  if (isNew) {
    if (!assignee) job.unitName = job.branchNames.length === 1 ? job.branchNames[0] : 'Several branches';
    pushHistory(d, job, 'Created', d.currentUser, now, { toAssigneeName: assignee?.name ?? null, taskNos: job.tasks.map((t) => t.taskNo), remarks: 'Created from the OD follow-up screen' });
  }
  return { job: out(d, job), addedTaskIds: job.tasks.filter((t) => !before.has(t.id)).map((t) => t.id), skipped };
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
