import { OfficerRole } from '../models/field-officer';
import { LiveStatus, StopKind } from '../models/live-position';
import { AlertSeverity, AlertStatus, AlertType } from '../models/tracking-alert';
import { JobStatus, JobTaskStatus, TaskType } from '../models/job';
import { ApprovalStatus, OutOfRadiusActivity } from '../models/approval-request';
import { GeoTagKind } from '../models/geo-tag';

/** Label + Tailwind classes + Lucide icon for a status-like value. */
export interface Tone {
  label: string;
  classes: string;
  icon: string;
  /** Hex colour for map markers and route lines. */
  color: string;
}

const tone = (label: string, classes: string, icon: string, color: string): Tone => ({ label, classes, icon, color });

const GREEN = 'bg-emerald-100 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300';
const BLUE = 'bg-blue-100 text-blue-700 ring-blue-600/20 dark:bg-blue-500/15 dark:text-blue-300';
const INDIGO = 'bg-indigo-100 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-500/15 dark:text-indigo-300';
const AMBER = 'bg-amber-100 text-amber-700 ring-amber-600/20 dark:bg-amber-500/15 dark:text-amber-300';
const RED = 'bg-rose-100 text-rose-700 ring-rose-600/20 dark:bg-rose-500/15 dark:text-rose-300';
const SLATE = 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-500/15 dark:text-slate-300';
const VIOLET = 'bg-violet-100 text-violet-700 ring-violet-600/20 dark:bg-violet-500/15 dark:text-violet-300';

export const JOB_STATUS: Record<JobStatus, Tone> = {
  Unassigned: tone('Unassigned', SLATE, 'user-plus', '#64748B'),
  Assigned: tone('Not started', BLUE, 'clipboard-list', '#2563EB'),
  InProgress: tone('In Progress', VIOLET, 'activity', '#7C3AED'),
  Overdue: tone('Overdue', RED, 'hourglass', '#E11D48'),
  Completed: tone('Completed', GREEN, 'circle-check', '#16A34A'),
  Cancelled: tone('Cancelled', SLATE, 'ban', '#94A3B8'),
};

export const JOB_TASK_STATUS: Record<JobTaskStatus, Tone> = {
  Pending: tone('Pending', BLUE, 'circle-dot', '#2563EB'),
  Completed: tone('Completed', GREEN, 'circle-check', '#16A34A'),
  Cancelled: tone('Cancelled', SLATE, 'x', '#94A3B8'),
  Transferred: tone('Transferred', INDIGO, 'arrow-right-left', '#4F46E5'),
  Rejected: tone('Rejected', RED, 'circle-x', '#E11D48'),
};

export const TASK_TYPE: Record<TaskType, Tone> = {
  GroupVisit: tone('Group Visit', VIOLET, 'users', '#7C3AED'),
  MemberVisit: tone('Member Visit', BLUE, 'user-round', '#2563EB'),
  OdFollowUp: tone('OD Follow-up', RED, 'indian-rupee', '#E11D48'),
  LeadSourcing: tone('Lead Sourcing', AMBER, 'target', '#D97706'),
  Survey: tone('Survey', INDIGO, 'clipboard-check', '#4F46E5'),
};

/** Short code shown inside map pins. */
export const TASK_TYPE_CODE: Record<TaskType, string> = {
  GroupVisit: 'G',
  MemberVisit: 'M',
  OdFollowUp: 'OD',
  LeadSourcing: 'L',
  Survey: 'S',
};

export const STOP_KIND: Record<StopKind, Tone> = {
  Designated: tone('Designated', GREEN, 'map-pin-check', '#16A34A'),
  Undesignated: tone('Undesignated', AMBER, 'map-pin-x', '#D97706'),
};

export const LIVE_STATUS: Record<LiveStatus, Tone> = {
  OnTask: tone('On Task', GREEN, 'clipboard-check', '#16A34A'),
  AtBranch: tone('At Branch', SLATE, 'building-2', '#0F766E'),
  Moving: tone('Moving', BLUE, 'navigation', '#2563EB'),
  Idle: tone('Stationary', AMBER, 'timer', '#D97706'),
  GpsOff: tone('GPS Off', RED, 'locate-off', '#E11D48'),
  Offline: tone('Offline', SLATE, 'satellite', '#64748B'),
  NotPunchedIn: tone('Not Punched In', SLATE, 'clock', '#94A3B8'),
  PunchedOut: tone('Punched Out', SLATE, 'log-out', '#475569'),
};

export const ALERT_TYPE: Record<AlertType, Tone> = {
  NearHome: tone('Near Home', AMBER, 'house', '#D97706'),
  GpsOff: tone('GPS Off', RED, 'locate-off', '#E11D48'),
  Stationary: tone('Stationary', AMBER, 'timer', '#D97706'),
  OutsideBranchRadius: tone('Outside 30 km', VIOLET, 'map-pin-off', '#7C3AED'),
  LocationMismatch: tone('Location Mismatch', RED, 'crosshair', '#E11D48'),
  OverdueJob: tone('Overdue Job', BLUE, 'hourglass', '#2563EB'),
};

export const ALERT_SEVERITY: Record<AlertSeverity, Tone> = {
  Low: tone('Low', SLATE, 'circle-dot', '#64748B'),
  Medium: tone('Medium', AMBER, 'triangle-alert', '#D97706'),
  High: tone('High', RED, 'siren', '#E11D48'),
};

export const ALERT_STATUS: Record<AlertStatus, Tone> = {
  Open: tone('Open', RED, 'bell', '#E11D48'),
  Acknowledged: tone('Acknowledged', AMBER, 'eye', '#D97706'),
  Resolved: tone('Resolved', GREEN, 'circle-check', '#16A34A'),
};

export const APPROVAL_STATUS: Record<ApprovalStatus, Tone> = {
  Pending: tone('Pending', AMBER, 'hourglass', '#D97706'),
  Approved: tone('Approved', GREEN, 'circle-check', '#16A34A'),
  Rejected: tone('Rejected', RED, 'circle-x', '#E11D48'),
};

export const ACTIVITY_LABEL: Record<OutOfRadiusActivity, string> = {
  LeadSourcing: 'New Lead Sourcing',
  CustomerVisit: 'Customer Visit',
  Survey: 'Area Survey',
  Other: 'Other Field Activity',
};

export const GEO_TAG_KIND: Record<GeoTagKind, Tone> = {
  Branch: tone('Branches', BLUE, 'building-2', '#2563EB'),
  GroupCentre: tone('Groups / Centres', VIOLET, 'users', '#7C3AED'),
  Customer: tone('Customer Homes', GREEN, 'map-pin-house', '#16A34A'),
  OdCustomer: tone('OD Customer Homes', RED, 'indian-rupee', '#E11D48'),
  EmployeeHome: tone('Employee Homes', AMBER, 'house', '#D97706'),
};

export const ROLE_LABEL: Record<OfficerRole, string> = {
  CO: 'Credit Officer',
  ABM: 'Assistant Branch Manager',
  BM: 'Branch Manager',
  AM: 'Area Manager',
  DM: 'Divisional Manager',
};

export function optionsOf<K extends string>(map: Record<K, Tone>): { value: K; label: string }[] {
  return (Object.keys(map) as K[]).map((value) => ({ value, label: map[value].label }));
}
