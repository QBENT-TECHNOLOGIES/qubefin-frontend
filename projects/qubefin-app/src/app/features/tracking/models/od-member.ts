import { OfficerRole } from './field-officer';
import { DpdRange } from '../utils/dpd';
import { GeoPoint } from './geo';
import { Job, JobStatus, JobTaskStatus, OdVisitOutcome, TaskPriority } from './job';

/** A row from the Loan Status Report that is past due (source: LOS/LMS). */
export interface OdMember {
  id: string;
  loanAccountNo: string;
  memberName: string;
  coBorrowerName: string | null;
  /** The group the member is mapped to. */
  groupId: string | null;
  groupName: string | null;
  centreName: string | null;
  /** Mapped Credit Officer of the member (filter only; does not limit who can be given the follow-up). */
  creditOfficerId: string | null;
  creditOfficerName: string | null;
  branchId: string;
  branchName: string;
  phone: string | null;
  address: string;
  overdueAmount: number;
  /** Days past due. */
  dpd: number;
  lastPaymentDate: string | null;
  homeLocation: GeoPoint | null;
  /**
   * The home geo-tag has been verified. A member whose location is not verified cannot be put in a job
   * (shown with a "Location Not Verified" badge) until it is.
   */
  locationVerified: boolean;
  /** Latest OD follow-up task for this member (in whichever job it was added to), if any. */
  followUp: OdFollowUpSummary | null;
  /**
   * Every pending OD follow-up for this member, one per job. Since Nov 2026 the same member may be pending with
   * several people (e.g. a CO and the BM); only the same person twice is refused.
   */
  pendingWith: OdPendingFollowUp[];
}

export interface OdPendingFollowUp {
  jobId: string;
  jobNo: string;
  taskNo: string;
  assigneeId: string;
  assigneeName: string;
}

export interface OdFollowUpSummary {
  jobId: string;
  jobNo: string;
  jobStatus: JobStatus;
  taskId: string;
  taskNo: string;
  assigneeName: string;
  assigneeRole: OfficerRole;
  completeBy: string;
  status: JobTaskStatus;
  outcome: OdVisitOutcome | null;
}

export interface OdMemberSearchRequest {
  searchText: string | null;
  branchId: string | null;
  /** Days-past-due range (`utils/dpd.ts`); null = any. */
  dpdRange: DpdRange | null;
  /** Members mapped to this Credit Officer; null = any. */
  creditOfficerId: string | null;
  /** Members mapped to this group; null = any. */
  groupId: string | null;
  /** true = only members without a pending follow-up task. */
  onlyUnassigned: boolean;
  pageIndex: number;
  pageSize: number;
  sortOn: string;
  sortDirection: 'asc' | 'desc';
}

export interface OdMemberSearchResponse {
  members: OdMember[];
  totalRecords: number;
  totalOverdueAmount: number;
}

/** Header of a new job created from the OD screen. */
export interface NewJobHeader {
  title: string;
  description: string | null;
  /** Required (400 when missing). */
  assigneeId: string;
  startFrom: string | null;
  completeBy: string;
}

/**
 * OD members are never assigned on their own: each becomes an OD follow-up task inside a job.
 * Send exactly one of `jobId` (add to an existing open job) or `newJob`.
 */
export interface AddOdToJobRequest {
  /** One entry per member; each becomes one OD follow-up task with its own priority, instruction and companion. */
  members: OdTaskInput[];
  jobId: string | null;
  newJob: NewJobHeader | null;
}

/** Task-level details for one OD member (there are no job-level defaults). */
export interface OdTaskInput {
  memberId: string;
  /** Default Medium. */
  priority: TaskPriority;
  /** Instruction (optional). */
  notes: string | null;
  /** Someone who goes along (optional). */
  accompaniedById: string | null;
}

export interface AddOdToJobResponse {
  job: Job;
  addedTaskIds: string[];
  /**
   * Members not added: no home geo-tag, location not verified, already pending with the same person,
   * or outside the assignee's branch.
   */
  skipped: { memberId: string; reason: string }[];
  /** Members added that are also pending with someone else (information only). */
  warnings: { memberId: string; reason: string }[];
}
