export interface ILeaveRequestDetailItem {
  id: string;
  leaveType: string;
  fromDate: string | Date | null;
  toDate: string | Date | null;
  reason: string;
  address: string;
}
export interface ILeaveRequestItem {
  id: string;
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
  history?: ILeaveRequestHistory[];
}

export interface ILeaveRequestListItem {
  id: string;
  leaveType: string;
  fromDate: string | Date | null;
  toDate: string | Date | null;
  days: number;
  status: string;
}

export interface ILeaveRequestHistory {
  event: string;
  eventBy: string;
  date: string | Date;
}

export interface IAuditInfo {
  createdBy: string;
  createdOn: string;
  lastModifiedBy?: string;
  lastModifiedOn?: string;
}
