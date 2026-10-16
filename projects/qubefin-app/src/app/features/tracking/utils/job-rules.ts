import { FieldOfficer, OfficerRole } from '../models/field-officer';
import { JobStatus, JobTask, TaskTarget, TaskTargetKind, TaskType } from '../models/job';

/*
 * Business rules shared by the screens (to guide the user) and the mock backend (to enforce them).
 * The real backend must enforce the same rules; see docs/TRACKING_API_CONTRACT.md §3.
 */

/** Roles whose jobs must stay inside their own branch. ABM follows BM (assumption, to confirm with the client). */
export const SINGLE_BRANCH_ROLES: readonly OfficerRole[] = ['CO', 'ABM', 'BM'];

export const OPEN_JOB_STATUSES: readonly JobStatus[] = ['Unassigned', 'Assigned', 'InProgress', 'Overdue'];

export function isOpenJob(status: JobStatus): boolean {
  return OPEN_JOB_STATUSES.includes(status);
}

/**
 * Why `officer` cannot hold a job whose tasks are in `branchIds`, or null when they can.
 * CO / ABM / BM: every task must be in their own branch. AM / DM: every task must be in a branch they cover.
 */
export function jobBranchConflict(officer: FieldOfficer, branchIds: readonly string[], branchNames?: (id: string) => string): string | null {
  const name = (id: string) => branchNames?.(id) ?? 'another branch';
  if (SINGLE_BRANCH_ROLES.includes(officer.role)) {
    const other = branchIds.find((b) => b !== officer.branchId);
    return other ? `${officer.role} jobs must stay in ${officer.branchName}; this job has tasks in ${name(other)}.` : null;
  }
  const outside = branchIds.find((b) => !officer.branchIds.includes(b));
  return outside ? `${name(outside)} is outside ${officer.name}'s ${officer.unitName}.` : null;
}

/** The place a task type usually points at. */
export const DEFAULT_TARGET_KIND: Record<TaskType, TaskTargetKind> = {
  GroupVisit: 'GroupCentre',
  MemberVisit: 'Customer',
  OdFollowUp: 'OdCustomer',
  CentreMeeting: 'GroupCentre',
  LeadSourcing: 'Custom',
  Survey: 'Custom',
};

/** Place kinds allowed per task type (first one is the default). */
export const TARGET_KINDS_FOR: Record<TaskType, TaskTargetKind[]> = {
  GroupVisit: ['GroupCentre'],
  MemberVisit: ['Customer', 'OdCustomer'],
  OdFollowUp: ['OdCustomer'],
  CentreMeeting: ['GroupCentre'],
  LeadSourcing: ['Custom', 'GroupCentre'],
  Survey: ['Custom', 'GroupCentre', 'Branch'],
};

export const TARGET_KIND_LABEL: Record<TaskTargetKind, string> = {
  Customer: 'Member / customer home',
  OdCustomer: 'Overdue customer home',
  GroupCentre: 'Group / centre',
  Branch: 'Branch',
  Custom: 'Point on map',
};

/** Key used to stop the same place getting the same kind of task twice while one is still pending. */
export function targetKey(type: TaskType, t: TaskTarget): string {
  const where = t.refId ? `${t.kind}:${t.refId}` : `pt:${t.location.lat.toFixed(4)},${t.location.lng.toFixed(4)}`;
  return `${type}|${where}`;
}

export function isPending(t: Pick<JobTask, 'status'>): boolean {
  return t.status === 'Pending';
}
