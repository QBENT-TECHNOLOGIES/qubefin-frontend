import { HttpErrorResponse, HttpEvent, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, delay, of, throwError } from 'rxjs';
import { mockDb, simulateLivePositions, simulateRoute, uuid } from './tracking-mock-db';
import {
  BulkReassignRequest,
  CancelTaskRequest,
  CreateTaskRequest,
  ReassignTaskRequest,
  TaskSearchRequest,
  TaskSearchResponse,
  TrackingTask,
} from '../models/tracking-task';
import {
  AssignOdFollowUpRequest,
  AssignOdFollowUpResponse,
  OverdueCustomerSearchRequest,
  OverdueCustomerSearchResponse,
} from '../models/overdue-customer';
import { AlertSearchRequest, AlertSearchResponse, AlertType, ResolveAlertRequest } from '../models/tracking-alert';
import { ApprovalDecisionRequest } from '../models/approval-request';
import { GeoTagKind, UpdateGeoTagRequest } from '../models/geo-tag';
import { TrackingSettings } from '../models/tracking-settings';
import { toDateKey } from '../utils/geo-utils';

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
  constructor(public status: number, message: string) {
    super(message);
  }
}

function fail(status: number, message: string): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status, error: { message }, statusText: 'Mock error' })).pipe(
    delay(LATENCY_MS),
  );
}

function route(req: HttpRequest<unknown>, path: string, q: URLSearchParams): unknown {
  const d = mockDb();
  const seg = path.split('/');
  const body = (req.body ?? {}) as Record<string, any>;
  const m = req.method;

  // ---- Lookups ---------------------------------------------------------------------------
  if (m === 'GET' && path === 'branches') return d.branches;
  if (m === 'GET' && path === 'field-officers') {
    const branchId = q.get('branchId');
    return d.officers.filter((o) => !branchId || o.branchId === branchId);
  }

  // ---- Tasks -----------------------------------------------------------------------------
  if (m === 'POST' && path === 'tasks/search') return searchTasks(body as TaskSearchRequest);
  if (m === 'POST' && path === 'tasks') return createTask(body as CreateTaskRequest);
  if (m === 'POST' && path === 'tasks/bulk-reassign') {
    const r = body as BulkReassignRequest;
    r.taskIds.forEach((id) => reassign(id, { assigneeId: r.assigneeId, remarks: r.remarks }));
    return { updated: r.taskIds.length };
  }
  if (seg[0] === 'tasks' && seg.length >= 2) {
    const task = d.tasks.find((t) => t.id === seg[1]);
    if (!task) throw new MockError(404, 'Task not found');
    if (m === 'GET' && seg.length === 2) return task;
    if (m === 'GET' && seg[2] === 'history') {
      return d.history.filter((h) => h.taskId === task.id).sort((a, b) => b.performedAt.localeCompare(a.performedAt));
    }
    if (m === 'PUT' && seg[2] === 'reassign') return reassign(task.id, body as ReassignTaskRequest);
    if (m === 'PUT' && seg[2] === 'cancel') {
      if (['Completed', 'Cancelled'].includes(task.status)) throw new MockError(400, `A ${task.status.toLowerCase()} task cannot be cancelled.`);
      task.status = 'Cancelled';
      addHistory(task, 'Cancelled', { remarks: (body as CancelTaskRequest).remarks });
      syncOdFollowUp(task);
      return task;
    }
  }

  // ---- Overdue customers -----------------------------------------------------------------
  if (m === 'POST' && path === 'overdue-customers/search') return searchOverdue(body as OverdueCustomerSearchRequest);
  if (m === 'POST' && path === 'overdue-customers/assign-follow-up') return assignOd(body as AssignOdFollowUpRequest);

  // ---- Live ------------------------------------------------------------------------------
  if (m === 'GET' && path === 'live/positions') {
    const branchId = q.get('branchId');
    return simulateLivePositions().filter((p) => !branchId || p.branchId === branchId);
  }
  if (m === 'GET' && seg[0] === 'employees' && seg[2] === 'route') {
    return simulateRoute(seg[1], q.get('date') ?? toDateKey());
  }

  // ---- Alerts ----------------------------------------------------------------------------
  if (m === 'POST' && path === 'alerts/search') return searchAlerts(body as AlertSearchRequest);
  if (m === 'GET' && path === 'alerts/open-count') return d.alerts.filter((a) => a.status === 'Open').length;
  if (seg[0] === 'alerts' && seg.length === 3 && m === 'PUT') {
    const alert = d.alerts.find((a) => a.id === seg[1]);
    if (!alert) throw new MockError(404, 'Alert not found');
    const nowIso = new Date().toISOString();
    if (seg[2] === 'acknowledge') {
      if (alert.status !== 'Open') throw new MockError(400, 'Only open alerts can be acknowledged.');
      alert.status = 'Acknowledged';
      alert.acknowledgedByName = d.currentUser.name;
      alert.acknowledgedAt = nowIso;
      return alert;
    }
    if (seg[2] === 'resolve') {
      if (alert.status === 'Resolved') throw new MockError(400, 'This alert is already resolved.');
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
    if (req2.status !== 'Pending') throw new MockError(400, 'This request has already been decided.');
    const dec = body as ApprovalDecisionRequest;
    req2.status = dec.approved ? 'Approved' : 'Rejected';
    req2.decidedByName = d.currentUser.name;
    req2.decidedAt = new Date().toISOString();
    req2.decisionRemarks = dec.remarks;
    return req2;
  }

  // ---- Geo-tags --------------------------------------------------------------------------
  if (m === 'GET' && path === 'geo-tags') {
    const kind = (q.get('kind') ?? 'Branch') as GeoTagKind;
    const text = (q.get('searchText') ?? '').toLowerCase().trim();
    const branchId = q.get('branchId');
    const onlyUntagged = q.get('onlyUntagged') === 'true';
    return d.geoTags.filter(
      (g) =>
        g.kind === kind &&
        (!branchId || g.branchId === branchId) &&
        (!onlyUntagged || !g.location) &&
        (!text || g.name.toLowerCase().includes(text) || g.refCode.toLowerCase().includes(text)),
    );
  }
  if (m === 'PUT' && seg[0] === 'geo-tags' && seg.length === 2) {
    const tag = d.geoTags.find((g) => g.id === seg[1]);
    if (!tag) throw new MockError(404, 'Geo-tag not found');
    const r = body as UpdateGeoTagRequest;
    if (!r.reason?.trim()) throw new MockError(400, 'A reason is required when changing a location.');
    tag.location = r.location;
    tag.radiusMeters = r.radiusMeters;
    tag.verified = true;
    tag.taggedByName = d.currentUser.name;
    tag.taggedAt = new Date().toISOString();
    tag.history.unshift({ location: r.location, radiusMeters: r.radiusMeters, changedByName: d.currentUser.name, changedAt: tag.taggedAt, reason: r.reason });
    // Keep the related records in step.
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
    if (tag.kind === 'OdCustomer') {
      const c = d.customers.find((x) => x.id === tag.refId);
      if (c) c.homeLocation = r.location;
    }
    return tag;
  }

  // ---- Settings --------------------------------------------------------------------------
  if (m === 'GET' && path === 'settings') return d.settings;
  if (m === 'PUT' && path === 'settings') {
    const s = body as TrackingSettings;
    if (s.homeRadiusMeters <= 0 || s.stationaryMinutes <= 0 || s.branchRadiusKm <= 0) {
      throw new MockError(400, 'Thresholds must be greater than zero.');
    }
    d.settings = { ...s, lastModifiedByName: d.currentUser.name, lastModifiedAt: new Date().toISOString() };
    d.branches.forEach((b) => (b.operatingRadiusKm = s.branchRadiusKm));
    return d.settings;
  }

  return NOT_FOUND;
}

// ---------------------------------------------------------------------------------------------

function addHistory(
  task: TrackingTask,
  action: 'Created' | 'Assigned' | 'Reassigned' | 'Cancelled',
  extra: { from?: string; to?: string; remarks?: string | null } = {},
) {
  const d = mockDb();
  d.history.push({
    id: uuid('hm', d.history.length + 1),
    taskId: task.id,
    action,
    performedById: d.currentUser.id,
    performedByName: d.currentUser.name,
    performedAt: new Date().toISOString(),
    fromAssigneeName: extra.from ?? null,
    toAssigneeName: extra.to ?? null,
    remarks: extra.remarks ?? null,
  });
}

function reassign(taskId: string, r: ReassignTaskRequest): TrackingTask {
  const d = mockDb();
  const task = d.tasks.find((t) => t.id === taskId);
  if (!task) throw new MockError(404, 'Task not found');
  if (['Completed', 'Cancelled', 'Missed'].includes(task.status)) {
    throw new MockError(400, `${task.taskNo} is ${task.status.toLowerCase()} and cannot be reassigned.`);
  }
  const officer = d.officers.find((o) => o.id === r.assigneeId);
  if (!officer) throw new MockError(400, 'Selected employee was not found.');
  if (officer.id === task.assigneeId) return task;
  const from = task.assigneeName;
  task.assigneeId = officer.id;
  task.assigneeName = officer.name;
  task.assigneeRole = officer.role;
  // Progress made by the previous assignee does not carry over.
  task.status = 'Assigned';
  task.timeline = { ...task.timeline, assignedAt: new Date().toISOString(), arrivedAt: null, startedAt: null, completedAt: null };
  task.verification = null;
  addHistory(task, 'Reassigned', { from, to: officer.name, remarks: r.remarks });
  syncOdFollowUp(task);
  return task;
}

function createTask(r: CreateTaskRequest): TrackingTask {
  const d = mockDb();
  const officer = d.officers.find((o) => o.id === r.assigneeId);
  if (!officer) throw new MockError(400, 'Selected employee was not found.');
  if (!r.title?.trim()) throw new MockError(400, 'Title is required.');
  const branch = d.branches.find((b) => b.id === officer.branchId)!;
  const n = d.tasks.length + 1;
  const now = new Date();
  const task: TrackingTask = {
    id: uuid('tm', n),
    taskNo: `TSK-${(25000 + n).toString()}`,
    type: r.type,
    title: r.title.trim(),
    description: r.description,
    priority: r.priority,
    source: 'Manual',
    status: 'Assigned',
    assigneeId: officer.id,
    assigneeName: officer.name,
    assigneeRole: officer.role,
    branchId: branch.id,
    branchName: branch.name,
    target: r.target,
    scheduledDate: r.scheduledDate,
    dueBy: r.dueBy,
    assignedById: d.currentUser.id,
    assignedByName: d.currentUser.name,
    timeline: { assignedAt: now.toISOString(), arrivedAt: null, startedAt: null, completedAt: null },
    verification: null,
    odOutcome: null,
    isLate: new Date(r.dueBy).getTime() < now.getTime(),
  };
  d.tasks.unshift(task);
  addHistory(task, 'Created', { to: officer.name, remarks: 'Manual assignment' });
  return task;
}

function syncOdFollowUp(task: TrackingTask) {
  if (task.type !== 'OdFollowUp' || !task.target.refId) return;
  const c = mockDb().customers.find((x) => x.id === task.target.refId);
  if (c?.followUp?.taskId === task.id) {
    c.followUp = { ...c.followUp, assigneeName: task.assigneeName, assigneeRole: task.assigneeRole, status: task.status };
  }
}

function inRange(dateKey: string, from: string | null, to: string | null) {
  return (!from || dateKey >= from) && (!to || dateKey <= to);
}

function searchTasks(r: TaskSearchRequest): TaskSearchResponse {
  const d = mockDb();
  const text = (r.searchText ?? '').toLowerCase().trim();
  const base = d.tasks.filter(
    (t) =>
      (!r.branchId || t.branchId === r.branchId) &&
      (!r.assigneeId || t.assigneeId === r.assigneeId) &&
      (!r.type || t.type === r.type) &&
      (!r.source || t.source === r.source) &&
      inRange(t.scheduledDate, r.fromDate, r.toDate) &&
      (!text || [t.taskNo, t.title, t.assigneeName, t.target.name].some((v) => v.toLowerCase().includes(text))),
  );
  // status=InProgress means "on site": Arrived or InProgress.
  const filtered = base.filter(
    (t) => !r.status || t.status === r.status || (r.status === 'InProgress' && t.status === 'Arrived'),
  );

  const dir = r.sortDirection === 'desc' ? -1 : 1;
  const key = r.sortOn as keyof TrackingTask;
  const sorted = [...filtered].sort((a, b) => {
    const av = String(a[key] ?? '');
    const bv = String(b[key] ?? '');
    return av.localeCompare(bv) * dir || a.dueBy.localeCompare(b.dueBy);
  });

  return {
    tasks: sorted.slice(r.pageIndex * r.pageSize, (r.pageIndex + 1) * r.pageSize),
    totalRecords: filtered.length,
    summary: {
      total: base.length,
      assigned: base.filter((t) => t.status === 'Assigned').length,
      inProgress: base.filter((t) => t.status === 'Arrived' || t.status === 'InProgress').length,
      completed: base.filter((t) => t.status === 'Completed').length,
      missed: base.filter((t) => t.status === 'Missed').length,
      late: base.filter((t) => t.isLate).length,
    },
  };
}

function searchOverdue(r: OverdueCustomerSearchRequest): OverdueCustomerSearchResponse {
  const d = mockDb();
  const text = (r.searchText ?? '').toLowerCase().trim();
  const open = (c: (typeof d.customers)[number]) =>
    !!c.followUp && ['Assigned', 'Arrived', 'InProgress'].includes(c.followUp.status);
  const filtered = d.customers.filter(
    (c) =>
      (!r.branchId || c.branchId === r.branchId) &&
      (r.minDpd === null || r.minDpd === undefined || c.dpd >= r.minDpd) &&
      (!r.onlyUnassigned || !open(c)) &&
      (!text || [c.customerName, c.loanAccountNo, c.groupName ?? ''].some((v) => v.toLowerCase().includes(text))),
  );
  const dir = r.sortDirection === 'desc' ? -1 : 1;
  const sorted = [...filtered].sort((a, b) => {
    if (r.sortOn === 'customerName') return a.customerName.localeCompare(b.customerName) * dir;
    if (r.sortOn === 'overdueAmount') return (a.overdueAmount - b.overdueAmount) * dir;
    return (a.dpd - b.dpd) * dir;
  });
  return {
    customers: sorted.slice(r.pageIndex * r.pageSize, (r.pageIndex + 1) * r.pageSize),
    totalRecords: filtered.length,
    totalOverdueAmount: filtered.reduce((s, c) => s + c.overdueAmount, 0),
  };
}

function assignOd(r: AssignOdFollowUpRequest): AssignOdFollowUpResponse {
  const d = mockDb();
  const officer = d.officers.find((o) => o.id === r.assigneeId);
  if (!officer) throw new MockError(400, 'Selected officer was not found.');
  if (!r.customerIds?.length) throw new MockError(400, 'Select at least one customer.');
  const created: string[] = [];
  const skipped: AssignOdFollowUpResponse['skipped'] = [];

  r.customerIds.forEach((id) => {
    const c = d.customers.find((x) => x.id === id);
    if (!c) return skipped.push({ customerId: id, reason: 'Customer not found' });
    if (!c.homeLocation) return skipped.push({ customerId: id, reason: `${c.customerName}: home is not geo-tagged` });
    if (c.followUp && ['Assigned', 'Arrived', 'InProgress'].includes(c.followUp.status)) {
      return skipped.push({ customerId: id, reason: `${c.customerName}: already has an open follow-up (${c.followUp.taskNo})` });
    }
    const due = new Date(`${r.scheduledDate}T18:00:00`);
    const task = createTask({
      type: 'OdFollowUp',
      title: `OD follow-up – ${c.customerName}`,
      description: `Overdue ₹${c.overdueAmount.toLocaleString('en-IN')} · ${c.dpd} DPD. ${r.remarks ?? ''}`.trim(),
      priority: 'High',
      assigneeId: officer.id,
      target: { kind: 'OdCustomer', refId: c.id, name: c.customerName, address: c.address, location: c.homeLocation, matchRadiusMeters: d.settings.locationMatchRadiusMeters },
      scheduledDate: r.scheduledDate,
      dueBy: due.toISOString(),
    });
    c.followUp = { taskId: task.id, taskNo: task.taskNo, assigneeName: officer.name, assigneeRole: officer.role, scheduledDate: r.scheduledDate, status: 'Assigned', outcome: null };
    created.push(task.id);
    return undefined;
  });
  return { createdTaskIds: created, skipped };
}

function searchAlerts(r: AlertSearchRequest): AlertSearchResponse {
  const d = mockDb();
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
  (['NearHome', 'GpsOff', 'Stationary', 'OutsideBranchRadius', 'LocationMismatch', 'LateTask'] as AlertType[]).forEach(
    (t) => (openByType[t] = d.alerts.filter((a) => a.type === t && a.status === 'Open' && (!r.branchId || a.branchId === r.branchId)).length),
  );
  return {
    alerts: filtered.slice(r.pageIndex * r.pageSize, (r.pageIndex + 1) * r.pageSize),
    totalRecords: filtered.length,
    openByType,
  };
}

