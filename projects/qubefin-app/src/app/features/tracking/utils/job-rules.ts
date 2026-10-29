import { FieldOfficer, OfficerRole, TrackingViewer, ViewerRole } from '../models/field-officer';
import { JobStatus, JobTask, TaskTarget, TaskTargetKind, TaskType } from '../models/job';

/*
 * Business rules shared by the screens (to guide the user) and the mock backend (to enforce them).
 * The real backend must enforce the same rules; see docs/TRACKING_API_CONTRACT.md §3.
 */

/**
 * Place in the hierarchy; a smaller number is higher. Admin = Super Admin or Application Administrator
 * (equal access in tracking). ABM sits between BM and CO (assumption, to confirm with the client).
 */
export const ROLE_RANK: Record<ViewerRole, number> = { Admin: 0, DM: 1, AM: 2, BM: 3, ABM: 4, CO: 5 };

/** True when `role` is below `than` in the hierarchy. */
export function isBelow(role: ViewerRole, than: ViewerRole): boolean {
  return ROLE_RANK[role] > ROLE_RANK[than];
}

/** Every branch in `branchIds` is inside the viewer's own branch / area / division (always true for Admin). */
export function inScope(viewer: Pick<TrackingViewer, 'role' | 'branchIds'>, branchIds: readonly string[]): boolean {
  return viewer.role === 'Admin' || branchIds.every((b) => viewer.branchIds.includes(b));
}

/**
 * Who may get work from the viewer: anyone in a lower role whose branches all lie inside the viewer's scope.
 * An AM can give jobs to the BMs and COs of their own area, a DM to anyone in their division, an Admin to everyone.
 */
export function canAssignWorkTo(viewer: Pick<TrackingViewer, 'role' | 'branchIds'>, officer: FieldOfficer): boolean {
  return isBelow(officer.role, viewer.role) && inScope(viewer, officer.branchIds);
}

/** Roles whose jobs must stay inside their own branch. ABM follows BM (assumption, to confirm with the client). */
export const SINGLE_BRANCH_ROLES: readonly OfficerRole[] = ['CO', 'ABM', 'BM'];

export const OPEN_JOB_STATUSES: readonly JobStatus[] = ['Unassigned', 'Assigned', 'InProgress', 'Delayed'];

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
  MemberVisit: 'Member',
  OdFollowUp: 'OdMember',
  LeadSourcing: 'Custom',
  Survey: 'Custom',
};

/** Place kinds allowed per task type. */
export const TARGET_KINDS_FOR: Record<TaskType, TaskTargetKind[]> = {
  GroupVisit: ['GroupCentre'],
  MemberVisit: ['Member', 'OdMember'],
  OdFollowUp: ['OdMember'],
  LeadSourcing: ['Custom', 'GroupCentre'],
  Survey: ['Custom', 'GroupCentre', 'Branch'],
};

/**
 * The task type follows from the place that is picked. The first entry is the default; the others are
 * what the task can be switched to after it is added (an OD member can get a plain member visit,
 * a group can get a survey). A point on the map is lead sourcing or a survey.
 */
export const TYPES_FOR_KIND: Record<TaskTargetKind, TaskType[]> = {
  GroupCentre: ['GroupVisit', 'Survey', 'LeadSourcing'],
  Member: ['MemberVisit'],
  OdMember: ['OdFollowUp', 'MemberVisit'],
  Branch: ['Survey'],
  Custom: ['LeadSourcing', 'Survey'],
};

export function defaultTypeFor(kind: TaskTargetKind): TaskType {
  return TYPES_FOR_KIND[kind][0];
}

/** Place kinds shown in the task picker (one call to `geo-tags/points`). */
export const PICKER_KINDS = ['GroupCentre', 'Member', 'OdMember'] as const;
export type PickerKind = (typeof PICKER_KINDS)[number];

export const TARGET_KIND_LABEL: Record<TaskTargetKind, string> = {
  Member: 'Member home',
  OdMember: 'OD member home',
  GroupCentre: 'Group / centre',
  Branch: 'Branch',
  Custom: 'Point on map',
};

/**
 * Place kinds whose location must be verified before the place can be put in a job: a group / centre, member or
 * OD member whose geo-tag is not verified is shown with a "Location Not Verified" badge and cannot be selected.
 * Locations are verified from the mobile app.
 */
export const VERIFIED_LOCATION_KINDS: readonly TaskTargetKind[] = ['GroupCentre', 'Member', 'OdMember'];

export const LOCATION_NOT_VERIFIED = 'Location not verified';

/** True when a place of this kind can only take a task once its location is verified. */
export function needsVerifiedLocation(kind: string): boolean {
  return (VERIFIED_LOCATION_KINDS as readonly string[]).includes(kind);
}

/** Key used to stop the same place getting the same kind of task twice while one is still pending. */
export function targetKey(type: TaskType, t: TaskTarget): string {
  const where = t.refId ? `${t.kind}:${t.refId}` : `pt:${t.location.lat.toFixed(4)},${t.location.lng.toFixed(4)}`;
  return `${type}|${where}`;
}

export function isPending(t: Pick<JobTask, 'status'>): boolean {
  return t.status === 'Pending';
}
