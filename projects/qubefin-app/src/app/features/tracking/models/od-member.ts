import { OfficerRole } from './field-officer';
import { DpdRange } from '../utils/dpd';
import { GeoPoint } from './geo';
import { Job, JobStatus, JobTaskStatus, OdVisitOutcome } from './job';

/** A row from the Loan Status Report that is past due (source: LOS/LMS). */
export interface OdMember {
  id: string;
  loanAccountNo: string;
  memberName: string;
  coBorrowerName: string | null;
  groupName: string | null;
  centreName: string | null;
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
}

export interface OdFollowUpSummary {
  jobId: string;
  jobNo: string;
  jobStatus: JobStatus;
  taskId: string;
  taskNo: string;
  /** null while the job is not assigned yet. */
  assigneeName: string | null;
  assigneeRole: OfficerRole | null;
  completeBy: string;
  status: JobTaskStatus;
  outcome: OdVisitOutcome | null;
}

export interface OdMemberSearchRequest {
  searchText: string | null;
  branchId: string | null;
  /** Days-past-due range (`utils/dpd.ts`); null = any. */
  dpdRange: DpdRange | null;
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
  assigneeId: string | null;
  startFrom: string | null;
  completeBy: string;
}

/**
 * OD members are never assigned on their own: each becomes an OD follow-up task inside a job.
 * Send exactly one of `jobId` (add to an existing open job) or `newJob`.
 */
export interface AddOdToJobRequest {
  memberIds: string[];
  jobId: string | null;
  newJob: NewJobHeader | null;
  /** Instructions copied to every task created. */
  notes: string | null;
}

export interface AddOdToJobResponse {
  job: Job;
  addedTaskIds: string[];
  /** Members not added: no home geo-tag, location not verified, already pending in a job, or outside the assignee's branch. */
  skipped: { memberId: string; reason: string }[];
}
