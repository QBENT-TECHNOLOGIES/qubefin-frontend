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

/** Every job has an assignee from the moment it is created (no "assign later" since Nov 2026). */
export type JobStatus = 'Assigned' | 'InProgress' | 'Completed' | 'Delayed' | 'Cancelled';

/**
 * Pending → Completed from the mobile app (visit, GPS photo, remarks).
 * Transferred = moved to another job; Rejected = a self-added task the job's creator refused.
 */
export type JobTaskStatus = 'Pending' | 'Completed' | 'Cancelled' | 'Transferred' | 'Rejected';

/** Assigned = put in the job by a manager; SelfAdded = added by the employee from the mobile app. */
export type TaskOrigin = 'Assigned' | 'SelfAdded';

export type TaskTargetKind = 'Member' | 'OdMember' | 'GroupCentre' | 'Branch' | 'Custom';

/** How urgent a task is. Set per task on the web (default Medium) and shown to the assignee on the mobile app. */
export type TaskPriority = 'VeryHigh' | 'High' | 'Medium' | 'Low';
export const TASK_PRIORITIES: readonly TaskPriority[] = ['VeryHigh', 'High', 'Medium', 'Low'];
export const DEFAULT_TASK_PRIORITY: TaskPriority = 'Medium';

/** Where the task must be done. Required for every task. */
/** Where a task is done (B2, inside `JobTask`; also sent in new tasks). Names as the API sends them. */
export interface TaskTarget {
  kind: TaskTargetKind;
  /** Id of the geo-tagged entity (group, member, OD member, branch); null for a point picked on the map. */
  originRefId: string | null;
  targetName: string;
  targetLocation: GeoPoint;
  /** Branch the place belongs to: CO / ABM / BM jobs may only hold tasks of their own branch. */
  organisationUnitId: string;
  branchName: string;
  /** Arrival and the completion photo must be within this distance of `targetLocation` (match radius). */
  radiusMeters: number;
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

/** A task of a job (B2, `Job.tasks`); names as the API sends them. */
export interface JobTask {
  id: string;
  taskNo: string;
  jobId: string;
  taskType: TaskType;
  taskTitle: string;
  /** Instruction for the assignee (optional). */
  notes: string | null;
  priority: TaskPriority;
  /**
   * Someone who goes along on this task (optional), e.g. the BM going with a CO. For information only:
   * the task, its route and allowance stay with the job's assignee.
   */
  coOrdinatedBy: string | null;
  coOrdinatedByName: string | null;
  target: TaskTarget;
  status: JobTaskStatus;
  origin: TaskOrigin;
  addedByName: string;
  taskAddedOn: string;
  /** Server-stamped from the mobile app; never sent by the web. */
  arrivedOn: string | null;
  taskCompletedOn: string | null;
  completedByName: string | null;
  /** Employee's remarks entered when completing. */
  remarks: string | null;
  verification: TaskVerification | null;
  odOutcome: OdVisitOutcome | null;
  /** Completed after the job's complete-by date. */
  isLate: boolean;
  transferredToJobId: string | null;
  transferredToJobCode: string | null;
  /** Why it was cancelled / rejected. */
  taskCancelReason: string | null;
  /** The caller may reject this task (a pending self-added task, and the caller may update the job). Set by the server. */
  canReject: boolean;
}

/** A job in lists (B1, POST tracking-api/jobs/search); names as the API sends them. `Job` adds the detail. */
export interface JobSummary {
  id: string;
  jobCode: string;
  jobTitle: string;
  status: JobStatus;
  /** Required: a job always has an assignee. */
  assigneeId: string;
  assigneeName: string;
  assigneeRole: OfficerRole;
  /** Branch / area / division the job belongs to (the assignee's unit). */
  unitName: string;
  /** Branch ids its tasks are in. */
  organisationUnitIds: string[];
  branchNames: string[];
  createdByName: string;
  /** When the job was created (server time). */
  createdOn: string;
  /** yyyy-MM-dd; the job shows in lists from this day (contract: start from). */
  startDate: string | null;
  /** yyyy-MM-dd; every task should be done by the end of this day (contract: complete by). */
  endDate: string;
  taskCount: number;
  doneCount: number;
  /** Pending tasks still to do. */
  openCount: number;
  selfAddedCount: number;
  /** Task types in the job, for chips in lists. */
  types: TaskType[];
  /**
   * Tasks per type (pending + completed, same basis as `taskCount`), e.g. `{ GroupVisit: 3, OdFollowUp: 1 }`.
   * Optional: while absent, the list shows the type icons without numbers.
   */
  typeCounts?: Partial<Record<TaskType, number>>;
  /** The job this one was split from by a partial transfer (id / code); null otherwise. */
  transferJobRefId: string | null;
  transferJobRefCode: string | null;
}

/**
 * What the signed-in user may do with a job, computed by the server (rules in docs §3.3).
 * The assignee never gets any of these on the web: work cannot be delegated, and tasks are
 * added to one's own job from the mobile app only.
 */
export interface JobPermissions {
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

/** One job with its tasks (B2, GET tracking-api/jobs/{id}); names as the API sends them. */
export interface Job extends JobSummary {
  jobDescription: string | null;
  /** Id of the user who created the job. */
  createdBy: string;
  tasks: JobTask[];
  permissions: JobPermissions;
}

export type JobHistoryAction =
  | 'Created'
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
/** One audit-trail entry (B3, GET tracking-api/jobs/{id}/history, newest first). */
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
  relatedJobCode: string | null;
  /** DateExtended only: the end date (complete by) before and after (yyyy-MM-dd); null otherwise. */
  oldCompleteBy: string | null;
  newCompleteBy: string | null;
  remarks: string | null;
}

export interface JobSearchRequest {
  searchText: string | null;
  status: JobStatus | null;
  /** true = Assigned, InProgress and Delayed only (ignored when `status` is set). */
  openOnly?: boolean;
  assigneeId: string | null;
  /** Jobs with a task in this branch. */
  organisationUnitId: string | null;
  /** Includes jobs whose end date (complete by) falls in the range (yyyy-MM-dd, inclusive). */
  dueFrom: string | null;
  dueTo: string | null;
  /**
   * Jobs with at least one OD member task (OD follow-up, or a member visit to an OD member), pending or completed,
   * whose member's current days past due is in this range (`utils/dpd.ts`). null = any job.
   */
  dpdRange?: DpdRange | null;
  pageIndex: number;
  pageSize: number;
  sortOn: 'endDate' | 'createdOn' | 'assigneeName' | 'status';
  sortDirection: SortDirection;
}

export interface JobSummaryCounts {
  total: number;
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
  /** Instruction (optional). */
  notes: string | null;
  /** Defaults to Medium when missing. */
  priority: TaskPriority;
  /** Optional companion; the server fills in the name. */
  accompaniedById: string | null;
  target: TaskTarget;
}

export interface CreateJobRequest {
  title: string;
  description: string | null;
  /** Required (400 when missing). */
  assigneeId: string;
  startFrom: string | null;
  completeBy: string;
  tasks: NewTaskInput[];
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
  /**
   * Pending tasks that did not move because the new assignee already has the same task at the same place
   * pending in another job. They stay in the original job.
   */
  skipped: SkippedTask[];
}

export interface AddTasksRequest {
  tasks: NewTaskInput[];
}

/** A task that was not added, with the reason (same person already has it, location not verified…). */
export interface SkippedTask {
  title: string;
  reason: string;
}

/** A task that was added, but the same place has the same task pending with someone else. For information only. */
export interface TaskWarning {
  title: string;
  reason: string;
}

export interface AddTasksResponse {
  job: Job;
  skipped: SkippedTask[];
  warnings: TaskWarning[];
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
  assigneeId: string;
  assigneeName: string;
  taskId: string;
  taskNo: string;
  title: string;
  type: TaskType;
  priority: TaskPriority;
  status: JobTaskStatus;
  targetKind: TaskTargetKind;
  /** Geo-tagged entity id (null for a point on the map). */
  refId: string | null;
  location: GeoPoint;
  /** Completion photo taken outside the match radius. */
  locationMismatch: boolean;
}
