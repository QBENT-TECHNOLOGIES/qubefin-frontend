import { IAuditInfo } from './leave-request';

export interface ILeaveApprovalListItem {
  id: string;
  employeeName: string;
  leaveType: string;
  fromDate: string | Date | null;
  toDate: string | Date | null;
  status: string;
}

export interface ILeaveApprovalItem {
  id: string;
  employeeName: string;
  leaveType: string;
  fromDate: string | Date | null;
  toDate: string | Date | null;
  days: number;
  status: string;
  reason: string;
  address: string;
  documentUrl?: string | null;
  document?: File;
  auditInfo: IAuditInfo | null;
  history?: ILeaveApprovalHistory[];
}

export interface ILeaveApprovalDetailItem {
  id: string;
  employeeName: string;
  leaveType: string;
  fromDate: string | Date | null;
  toDate: string | Date | null;
  reason: string;
  address: string;
  documentUrl?: string | null;
  remarks: string;
}

export interface ILeaveApprovalHistory {
  event: string;
  eventBy: string;
  date: string | Date;
}
