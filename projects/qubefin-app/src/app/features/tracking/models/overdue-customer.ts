import { OfficerRole } from './field-officer';
import { GeoPoint } from './geo';
import { Job, JobStatus, JobTaskStatus, OdVisitOutcome } from './job';

/** A row from the Loan Status Report that is past due (source: LOS/LMS). */
export interface OverdueCustomer {
  id: string;
  loanAccountNo: string;
  customerName: string;
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
  /** Latest OD follow-up task for this customer (in whichever job it was added to), if any. */
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

export interface OverdueCustomerSearchRequest {
  searchText: string | null;
  branchId: string | null;
  minDpd: number | null;
  /** true = only customers without a pending follow-up task. */
  onlyUnassigned: boolean;
  pageIndex: number;
  pageSize: number;
  sortOn: string;
  sortDirection: 'asc' | 'desc';
}

export interface OverdueCustomerSearchResponse {
  customers: OverdueCustomer[];
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
 * OD customers are never assigned on their own: each becomes an OD follow-up task inside a job.
 * Send exactly one of `jobId` (add to an existing open job) or `newJob`.
 */
export interface AddOdToJobRequest {
  customerIds: string[];
  jobId: string | null;
  newJob: NewJobHeader | null;
  /** Instructions copied to every task created. */
  notes: string | null;
}

export interface AddOdToJobResponse {
  job: Job;
  addedTaskIds: string[];
  /** Customers not added: no home geo-tag, already pending in a job, or outside the assignee's branch. */
  skipped: { customerId: string; reason: string }[];
}
