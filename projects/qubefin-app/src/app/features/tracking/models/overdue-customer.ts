import { GeoPoint } from './geo';
import { TaskStatus, OdVisitOutcome } from './tracking-task';

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
  /** Latest follow-up assignment for this customer, if any. */
  followUp: OdFollowUpSummary | null;
}

export interface OdFollowUpSummary {
  taskId: string;
  taskNo: string;
  assigneeName: string;
  assigneeRole: string;
  scheduledDate: string;
  status: TaskStatus;
  outcome: OdVisitOutcome | null;
}

export interface OverdueCustomerSearchRequest {
  searchText: string | null;
  branchId: string | null;
  minDpd: number | null;
  /** true = only customers without an open follow-up task. */
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

export interface AssignOdFollowUpRequest {
  customerIds: string[];
  assigneeId: string;
  scheduledDate: string;
  remarks: string | null;
}

export interface AssignOdFollowUpResponse {
  createdTaskIds: string[];
  /** Customers skipped because they have no geo-tagged home or already have an open task. */
  skipped: { customerId: string; reason: string }[];
}
