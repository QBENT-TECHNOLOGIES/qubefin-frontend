import { IAuditInfo, ILeaveRequestHistory } from './leave-request';

export interface ILeavePrayerDetailItem {
  id: string;
  leaveTypeId: string;
  prayerDays: number;
  remarks: string;
}
export interface ILeavePrayerItem {
  id: string;
  leaveType: string;
  prayerDays: number | null;
  currentStatus: string;
  appliedOn: string | Date | null;
  leavePrayerRemarks: string;
  attachmentUrl?: string | null;
  attachment?: string | null;
  auditInfo: IAuditInfo | null;
  isRecommendEvent: boolean;
  isApprovalEvent: boolean;
  events?: ILeaveRequestHistory[];
}
export interface ILeavePrayerListItem {
  id: string;
  leaveType: string;
  prayerDays: number;
  appliedOn: string | Date | null;
  remarks: string;
  curentStatus: string;
}
export interface ILeavePrayerApprovalListItem {
  id: string;
  employeeName: string;
  leaveType: string;
  prayerDays: number;
  appliedOn: string | Date | null;
  remarks: string;
  curentStatus: string;
}

export interface ILeavePrayerHistory {
  event: string;
  eventBy: string;
  date: string | Date;
}
