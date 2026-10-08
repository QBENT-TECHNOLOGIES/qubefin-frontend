import { EMPLOYEE_RECORD_TABS, EmployeeRecordTab } from './employee-record';

export type EmployeeApprovalTab = Extract<
  EmployeeRecordTab,
  'leave' | 'regularization' | 'prayer' | 'fitness'
>;

export interface IEmployeeApprovalTabConfig {
  key: EmployeeApprovalTab;
  label: string;
  /** Key into APP_ICONS_MAP, bound as [lucideIcon]="iconMap[tab.icon]". */
  icon: string;
}

/** Attendance is the one record tab with no approval queue behind it. */
const APPROVAL_TAB_KEYS: readonly EmployeeApprovalTab[] = [
  'leave',
  'regularization',
  'prayer',
  'fitness',
];

/**
 * Derived from EMPLOYEE_RECORD_TABS rather than restated, so the label, icon and order
 * of these tabs always match the employee records page. Renaming or reordering a tab
 * there carries over here on its own.
 */
export const EMPLOYEE_APPROVAL_TABS: readonly IEmployeeApprovalTabConfig[] =
  EMPLOYEE_RECORD_TABS.filter((tab) =>
    APPROVAL_TAB_KEYS.includes(tab.key as EmployeeApprovalTab),
  ).map((tab) => ({
    key: tab.key as EmployeeApprovalTab,
    label: tab.label,
    icon: tab.icon,
  }));
