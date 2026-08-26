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
  alias?: string;
  Alias?: string; // from user json
  leaveTypeId: string;
  fromDate: string | Date | null;
  toDate: string | Date | null;
  totalDays: number;
  currentStatus: string;
  reason: string;
  address: string;
  enclosedDocName: string | null;
  enclosedDocNo: string | null;
  enclosedDocUrl: string | null;
  isSubmitted: boolean;
  isCancellable: boolean;
  rejectedReason: string | null;
  approvalCategory: string;
  eventButtonText: string;
  isRecommendEvent: boolean;
  isApprovalEvent: boolean;
  fitnessReportAttachment: string | null;
  fitnessReportUrl: string | null;
  isFitnessReportApproved: boolean;
  fitnessReportApprovedBy: string | null;
  events: ILeaveRequestHistory[];
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
  eventStatus: string;
  eventDate: string | Date;
  remarks: string;
  designation?: string | null;
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
  isEligible: boolean;
}
