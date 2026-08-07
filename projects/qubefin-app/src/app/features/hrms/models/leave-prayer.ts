import { IAuditInfo } from "./leave-request";

export interface ILeavePrayerDetailItem {
  id: string;
  leaveType: string;
  remarks: string;
}
export interface ILeavePrayerItem {
  id: string;
  leaveType: string;
  remarks: string;
  documentUrl?: string | null;
  documentName?: string | null;
  auditInfo: IAuditInfo | null;
}

export interface ILeavePrayerListItem {
  id: string;
  leaveType: string;
  appliedOn: string | Date | null;
  remarks: string;
  status: string;
}

export interface ILeavePrayerHistory {
  event: string;
  eventBy: string;
  date: string | Date;
}
