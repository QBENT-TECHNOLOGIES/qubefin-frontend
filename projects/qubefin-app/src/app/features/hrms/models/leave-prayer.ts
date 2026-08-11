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
  documentUrl?: string | null;
  documentName?: string | null;
  auditInfo: IAuditInfo | null;
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

export interface ILeavePrayerHistory {
  event: string;
  eventBy: string;
  date: string | Date;
}
