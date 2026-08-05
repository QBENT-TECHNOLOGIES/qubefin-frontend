export interface ILeaveRequestDetailItem {
  id: string;
  leaveTypeId: string;
  fromDate: string | Date | null;
  toDate: string | Date | null;
  reason: string;
  address: string;
}
export interface ILeaveRequestItem {
  id: string;
  employeeName: string;
  leaveType: string;
  leaveTypeId: string;
  fromDate: string | Date | null;
  toDate: string | Date | null;
  totalDays: number;
  currentStatus: string;
  reason: string;
  address: string;
  enclosedDocUrl?: string | null;
  enclosedDocName?: string | null;
  enclosedDocNo?: string | null;
  isSubmitted: boolean;
  isCancellable: boolean;
  rejectedReason: string;
  approvalCategory: string;
  eventButtonText: string;
  isRecommendEvent: boolean;
  isApprovalEvent: boolean;
  events?: ILeaveRequestHistory[];
}

export interface ILeaveRequestListItem {
  id: string;
  leaveType: string;
  fromDate: string | Date | null;
  toDate: string | Date | null;
  totaldays: number;
  currentStatus: string;
}

export interface ILeaveRequestHistory {
  event: string;
  eventBy: string | null;
  eventOn: string | Date;
  eventRemarks: string;
  senderDesignation?: string | null;
  receiverDesignation?: string | null;
}

export interface IAuditInfo {
  createdBy: string;
  createdOn: string;
  lastModifiedBy?: string;
  lastModifiedOn?: string;
}

export interface ILeaveTypeBalance {
  leaveTypeId: string;
  title: string;
  alias: string;
  leaveEntitled: number;
  leaveTaken: number;
  leaveBalance: number;
}
