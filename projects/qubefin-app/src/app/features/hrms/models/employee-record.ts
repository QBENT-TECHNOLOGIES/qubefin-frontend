export type EmployeeRecordTab = 'leave' | 'regularization' | 'prayer' | 'attendance' | 'fitness';

export type EmployeeRecordStatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

export type EmployeeRecordDateMode = 'range' | 'all';

export interface IEmployeeRecordRow {
  id: string;
  recordType: EmployeeRecordTab;
  employeeName: string | null;
  employeeCode: string | null;
  organizationUnit: string | null;
  category: string | null;
  period: string | null;
  quantity: string | null;
  stage: string | null;
  status: string | null;

  fromDate: string | null;
  toDate: string | null;
  appliedOn: string | null;
  days: number | null;

  workingHours: string | null;
  reason: string | null;
  attachment: string | null;
}

export interface IEmployeeRecordCounts {
  leave: number;
  regularization: number;
  prayer: number;
  attendance: number;
  fitness: number;
}

export interface IEmployeeRecordStatusCounts {
  all: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
}

export interface IEmployeeRecordDetailField {
  label: string;
  value: string | null;
}

export interface IEmployeeRecordEvent {
  eventStatus: string | null;
  eventDate: string | Date | null;
  designation?: string | null;
  remarks: string | null;
}

export interface IEmployeeRecordDetail {
  id: string;
  recordType: EmployeeRecordTab;

  employeeId: string;
  employeeName: string | null;
  employeeCode: string | null;
  organizationUnit: string | null;
  designation: string | null;
  company: string | null;

  category: string | null;
  period: string | null;
  fromDate: string | null;
  toDate: string | null;
  days: number | null;
  appliedOn: string | null;
  status: string | null;

  reason: string | null;
  remarks: string | null;
  address: string | null;
  attachment: string | null;
  attachmentUrl: string | null;

  fields: IEmployeeRecordDetailField[];
  events: IEmployeeRecordEvent[];
}

export interface IEmployeeRecordSearchResponse {
  results: IEmployeeRecordRow[];
  totalRecords: number;
  counts: IEmployeeRecordCounts;
  statusCounts: IEmployeeRecordStatusCounts;
}

/** A null header hides that column for the record type, so no column shows data it does not have. */
export interface IEmployeeRecordTabHeaders {
  category: string | null;
  period: string;
  quantity: string;
  appliedOn: string;
  stage: string | null;
}

export interface IEmployeeRecordTabConfig {
  key: EmployeeRecordTab;
  label: string;
  /** Key into APP_ICONS_MAP, bound as [lucideIcon]="iconMap[tab.icon]". */
  icon: string;
  kindLabel: string;
  emptyMessage: string;
  supportsStatusFilter: boolean;
  headers: IEmployeeRecordTabHeaders;
}

export const EMPLOYEE_RECORD_TABS: readonly IEmployeeRecordTabConfig[] = [
  {
    key: 'leave',
    label: 'Leave Requests',
    icon: 'CalendarDays',
    kindLabel: 'Leave Request',
    emptyMessage: 'No leave requests found.',
    supportsStatusFilter: true,
    headers: {
      category: 'Leave Type',
      period: 'From – To',
      quantity: 'Days',
      appliedOn: 'Applied',
      stage: null,
    },
  },
  {
    key: 'regularization',
    label: 'Regularization',
    icon: 'ClipboardCheck',
    kindLabel: 'Regularization',
    emptyMessage: 'No regularization requests found.',
    supportsStatusFilter: true,
    headers: {
      category: 'Type',
      period: 'Date(s)',
      quantity: 'In – Out',
      appliedOn: 'Applied',
      stage: null,
    },
  },
  {
    key: 'prayer',
    label: 'Leave Prayer',
    icon: 'CalendarPlus',
    kindLabel: 'Leave Prayer',
    emptyMessage: 'No leave prayers found.',
    supportsStatusFilter: true,
    headers: {
      category: 'Leave Type',
      period: 'Prayer For',
      quantity: 'Days',
      appliedOn: 'Applied',
      stage: null,
    },
  },
  {
    key: 'attendance',
    label: 'Attendance History',
    icon: 'Clock',
    kindLabel: 'Attendance',
    emptyMessage: 'No attendance records found.',
    supportsStatusFilter: false,
    headers: {
      category: null,
      period: 'Date',
      quantity: 'In – Out',
      appliedOn: 'Work Hrs',
      stage: 'Regularized',
    },
  },
  {
    key: 'fitness',
    label: 'Fitness Approval',
    icon: 'Activity',
    kindLabel: 'Fitness Report',
    emptyMessage: 'No fitness reports found.',
    supportsStatusFilter: true,
    headers: {
      category: 'Leave Type',
      period: 'Leave Period',
      quantity: 'Days',
      appliedOn: 'Uploaded',
      stage: null,
    },
  },
];
