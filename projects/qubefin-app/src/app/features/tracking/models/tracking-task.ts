import { OfficerRole } from './field-officer';
import { GeoPoint, SortDirection } from './geo';

export type TaskType =
  | 'CustomerVisit'
  | 'OdFollowUp'
  | 'GroupMeeting'
  | 'LeadSourcing'
  | 'Survey'
  | 'Other';

export type TaskStatus = 'Assigned' | 'Arrived' | 'InProgress' | 'Completed' | 'Missed' | 'Cancelled';

export type TaskPriority = 'Low' | 'Normal' | 'High';

/** System = created by an allocation rule; Manual = assigned by an authorised official. */
export type TaskSource = 'System' | 'Manual';

export type TaskTargetKind = 'Customer' | 'OdCustomer' | 'GroupCentre' | 'Branch' | 'Custom';

export interface TaskTarget {
  kind: TaskTargetKind;
  /** Id of the geo-tagged entity (customer, group, branch); null for a custom pin. */
  refId: string | null;
  name: string;
  address: string;
  location: GeoPoint;
  /** Arrival / completion must be within this distance of `location`. */
  matchRadiusMeters: number;
}

/** Server-stamped milestones. The UI only displays these; it never sends them. */
export interface TaskTimeline {
  assignedAt: string;
  arrivedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
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

/** Outcome recorded on an overdue (OD) follow-up visit. */
export interface OdVisitOutcome {
  customerAvailable: boolean;
  paid: boolean;
  amountCollected: number | null;
  /** Promise-to-pay date, required when the customer did not pay. */
  ptpDate: string | null;
  remarks: string | null;
}

export interface TrackingTask {
  id: string;
  taskNo: string;
  type: TaskType;
  title: string;
  description: string | null;
  priority: TaskPriority;
  source: TaskSource;
  status: TaskStatus;
  assigneeId: string;
  assigneeName: string;
  assigneeRole: OfficerRole;
  branchId: string;
  branchName: string;
  target: TaskTarget;
  /** yyyy-MM-dd */
  scheduledDate: string;
  /** ISO time the task must be completed by. */
  dueBy: string;
  assignedById: string;
  assignedByName: string;
  timeline: TaskTimeline;
  verification: TaskVerification | null;
  odOutcome: OdVisitOutcome | null;
  /** Server-computed: completed after dueBy, or still open after dueBy. */
  isLate: boolean;
}

export type TaskHistoryAction =
  | 'Created'
  | 'Assigned'
  | 'Reassigned'
  | 'Cancelled'
  | 'Arrived'
  | 'Started'
  | 'Completed'
  | 'MarkedMissed';

/** Immutable audit-trail entry. */
export interface TaskHistoryEntry {
  id: string;
  taskId: string;
  action: TaskHistoryAction;
  performedById: string;
  performedByName: string;
  performedAt: string;
  fromAssigneeName: string | null;
  toAssigneeName: string | null;
  remarks: string | null;
}

export interface TaskSearchRequest {
  searchText: string | null;
  status: TaskStatus | null;
  type: TaskType | null;
  source: TaskSource | null;
  branchId: string | null;
  assigneeId: string | null;
  /** yyyy-MM-dd, inclusive */
  fromDate: string | null;
  toDate: string | null;
  pageIndex: number;
  pageSize: number;
  sortOn: string;
  sortDirection: SortDirection;
}

export interface TaskSummary {
  total: number;
  assigned: number;
  inProgress: number;
  completed: number;
  missed: number;
  late: number;
}

export interface TaskSearchResponse {
  tasks: TrackingTask[];
  totalRecords: number;
  summary: TaskSummary;
}

export interface CreateTaskRequest {
  type: TaskType;
  title: string;
  description: string | null;
  priority: TaskPriority;
  assigneeId: string;
  target: TaskTarget;
  scheduledDate: string;
  dueBy: string;
}

export interface ReassignTaskRequest {
  assigneeId: string;
  remarks: string;
}

export interface BulkReassignRequest {
  taskIds: string[];
  assigneeId: string;
  remarks: string;
}

export interface CancelTaskRequest {
  remarks: string;
}
