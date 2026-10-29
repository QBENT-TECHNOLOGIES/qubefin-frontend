import { OfficerRole } from './field-officer';
import { DpdRange } from '../utils/dpd';
import { GeoPoint, SortDirection } from './geo';

/*
 * A JOB is what gets assigned: a container with one "complete by" date.
 * TASKS live inside a job. Every task has a location, no time of its own and no order:
 * the employee does them in any sequence before the job's date.
 */

/** Group Visit also covers the group / centre meeting (one type since Oct 2026). */
export type TaskType = 'GroupVisit' | 'MemberVisit' | 'OdFollowUp' | 'LeadSourcing' | 'Survey';

export type JobStatus = 'Unassigned' | 'Assigned' | 'InProgress' | 'Completed' | 'Delayed' | 'Cancelled';

/**
 * Pending → Completed from the mobile app (visit, GPS photo, remarks).
 * Transferred = moved to another job; Rejected = a self-added task the job's creator refused.
 */
export type JobTaskStatus = 'Pending' | 'Completed' | 'Cancelled' | 'Transferred' | 'Rejected';

/** Assigned = put in the job by a manager; SelfAdded = added by the employee from the mobile app. */
export type TaskOrigin = 'Assigned' | 'SelfAdded';

export type TaskTargetKind = 'Member' | 'OdMember' | 'GroupCentre' | 'Branch' | 'Custom';

/** Where the task must be done. Required for every task. */
export interface TaskTarget {
  kind: TaskTargetKind;
  /** Id of the geo-tagged entity; null for a point picked on the map. */
  refId: string | null;
  name: string;
  address: string;
  location: GeoPoint;
  /** Branch the place belongs to: CO / ABM / BM jobs may only hold tasks of their own branch. */
  branchId: string;
  branchName: string;
  /** Arrival and the completion photo must be within this distance of `location`. */
  matchRadiusMeters: number;
}

export interface TaskVerification {
  arrivalLocation: GeoPoint | null;
  arrivalDistanceMeters: number | null;
  completionLocation: GeoPoint | null;
  completionDistanceMeters: number | null;
  /** True when the completion photo was taken within `matchRadiusMeters` of the target. */
  locationMatched: boolean | null;
  photoUrl: string | null;
  photoTakenAt: string | null;
}

/** Outcome recorded on an OD follow-up visit. */
export interface OdVisitOutcome {
  memberAvailable: boolean;
  paid: boolean;
  amountCollected: number | null;
  /** Promise-to-pay date, required when the member did not pay. */
  ptpDate: string | null;
}

export interface JobTask {
  id: string;
  taskNo: string;
  jobId: string;
  type: TaskType;
  title: string;
  /** Manager's instructions. */
  notes: string | null;
  target: TaskTarget;
  status: JobTaskStatus;
  origin: TaskOrigin;
  addedByName: string;
  addedAt: string;
  /** Server-stamped from the mobile app; never sent by the web. */
  arrivedAt: string | null;
  completedAt: string | null;
  completedByName: string | null;
  /** Employee's remarks entered when completing. */
  remarks: string | null;
  verification: TaskVerification | null;
  odOutcome: OdVisitOutcome | null;
  /** Completed after the job's complete-by date. */
  isLate: boolean;
  transferredToJobId: string | null;
  transferredToJobNo: string | null;
  /** Why it was cancelled / rejected. */
  closedReason: string | null;
}

export interface JobSummary {
  id: string;
  jobNo: string;
  title: string;
  status: JobStatus;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeRole: OfficerRole | null;
  /** Branch / area / division the job belongs to (the assignee's unit, or the creator's while unassigned). */
  unitName: string;
  /** Branches its tasks are in. */
  branchIds: string[];
  branchNames: string[];
  createdByName: string;
  createdAt: string;
  /** yyyy-MM-dd; the job shows in lists from this day. */
  startFrom: string | null;
  /** yyyy-MM-dd; every task should be done by the end of this day. */
  completeBy: string;
  taskCount: number;
  doneCount: number;
  /** Pending tasks still to do. */
  openCount: number;
  selfAddedCount: number;
  /** Task types in the job, for chips in lists. */
  types: TaskType[];
  transferredFromJobId: string | null;
  transferredFromJobNo: string | null;
}

/**
 * What the signed-in user may do with a job, computed by the server (rules in docs §3.3).
 * The assignee never gets any of these on the web: work cannot be delegated, and tasks are
 * added to one's own job from the mobile app only.
 */
export interface JobPermissions {
  /** Assign an unassigned job: its creator or anyone above the creator. */
  canAssign: boolean;
  /** Move the job, or its pending tasks, to someone else: its creator or anyone above the creator. */
  canTransfer: boolean;
  /** Cancel the whole job: its creator or anyone above the creator. */
  canCancel: boolean;
  /**
   * Add tasks, extend the date, cancel a task, reject a self-added task: the creator, anyone above the
   * creator, or a manager above the assignee in their scope (e.g. the BM of a CO who got a job from the AM).
   */
  canUpdate: boolean;
}

export interface Job extends JobSummary {
  description: string | null;
  createdById: string;
  tasks: JobTask[];
  permissions: JobPermissions;
}

export type JobHistoryAction =
  | 'Created'
  | 'Assigned'
  | 'Transferred'
  | 'TasksTransferredOut'
  | 'TasksTransferredIn'
  | 'TasksAdded'
  | 'TaskSelfAdded'
  | 'TaskCompleted'
  | 'TaskCancelled'
  | 'TaskRejected'
  | 'DateExtended'
  | 'BecameDelayed'
  | 'Completed'
  | 'Cancelled';

/** Append-only audit trail of a job. */
export interface JobHistoryEntry {
  id: string;
  jobId: string;
  action: JobHistoryAction;
  performedByName: string;
  performedAt: string;
  fromAssigneeName: string | null;
  toAssigneeName: string | null;
  taskNos: string[];
  /** The other job in a partial transfer. */
  relatedJobId: string | null;
  relatedJobNo: string | null;
  remarks: string | null;
}

export interface JobSearchRequest {
  searchText: string | null;
  status: JobStatus | null;
  /** true = Unassigned, Assigned, InProgress and Delayed only (ignored when `status` is set). */
  openOnly?: boolean;
  assigneeId: string | null;
  branchId: string | null;
  /** Includes jobs whose complete-by date falls in the range (yyyy-MM-dd, inclusive). */
  dueFrom: string | null;
  dueTo: string | null;
  /**
   * Jobs with at least one OD member task (OD follow-up, or a member visit to an OD member), pending or completed,
   * whose member's current days past due is in this range (`utils/dpd.ts`). null = any job.
   */
  dpdRange?: DpdRange | null;
  pageIndex: number;
  pageSize: number;
  sortOn: 'completeBy' | 'createdAt' | 'assigneeName' | 'status';
  sortDirection: SortDirection;
}

export interface JobSummaryCounts {
  total: number;
  unassigned: number;
  assigned: number;
  inProgress: number;
  delayed: number;
  completed: number;
}

export interface JobSearchResponse {
  jobs: JobSummary[];
  totalRecords: number;
  summary: JobSummaryCounts;
}

/** A task as entered on the web. */
export interface NewTaskInput {
  type: TaskType;
  title: string;
  notes: string | null;
  target: TaskTarget;
}

export interface CreateJobRequest {
  title: string;
  description: string | null;
  /** null = create now, assign later. */
  assigneeId: string | null;
  startFrom: string | null;
  completeBy: string;
  tasks: NewTaskInput[];
}

export interface AssignJobRequest {
  assigneeId: string;
  remarks: string | null;
}

/** taskIds = null moves the whole job; a list moves only those tasks into a new linked job. */
export interface TransferJobRequest {
  assigneeId: string;
  taskIds: string[] | null;
  remarks: string;
  /** For a partial transfer: the new job's complete-by date (defaults to the original's). */
  completeBy: string | null;
}

export interface TransferJobResponse {
  job: Job;
  /** The new job created by a partial transfer. */
  newJob: Job | null;
}

export interface AddTasksRequest {
  tasks: NewTaskInput[];
}

/** A task that was not added, with the reason (duplicate place, wrong branch…). */
export interface SkippedTask {
  title: string;
  reason: string;
}

export interface AddTasksResponse {
  job: Job;
  skipped: SkippedTask[];
}

export interface ExtendJobRequest {
  completeBy: string;
  remarks: string;
}

export interface RemarksRequest {
  remarks: string;
}

/** A task location for the monitoring overview map (GET jobs/task-points). */
export interface JobTaskPoint {
  jobId: string;
  jobNo: string;
  jobTitle: string;
  jobStatus: JobStatus;
  /** Job window, for the overlap rule: startFrom (or the creation day) to completeBy. */
  jobStartFrom: string;
  jobCompleteBy: string;
  assigneeId: string | null;
  assigneeName: string | null;
  taskId: string;
  taskNo: string;
  title: string;
  type: TaskType;
  status: JobTaskStatus;
  targetKind: TaskTargetKind;
  /** Geo-tagged entity id (null for a point on the map). */
  refId: string | null;
  location: GeoPoint;
  /** Completion photo taken outside the match radius. */
  locationMismatch: boolean;
}
