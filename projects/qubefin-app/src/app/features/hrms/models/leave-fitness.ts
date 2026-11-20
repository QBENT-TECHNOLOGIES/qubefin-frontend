export interface ILeaveFitnessItem {
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
  events: ILeaveFitnessHistory[];
}

export interface ILeaveFitnessHistory {
  eventStatus: string;
  eventDate: string | Date;
  remarks: string | null;
  designation: string | null;
}

export interface ILeaveFitnessListItem {
  leaveRequestId: string;
  employeeName: string;
  leaveType: string;
  fromDate: string | Date | null;
  toDate: string | Date | null;
  totalDays: number;
}
