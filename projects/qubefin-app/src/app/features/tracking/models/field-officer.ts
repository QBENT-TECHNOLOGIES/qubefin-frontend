import { GeoPoint } from './geo';

/**
 * Field roles, top to bottom (all of them are tracked), exactly as tracking-api sends them:
 * Divisional Manager > Area Manager > Branch Manager = Assistant Branch Manager > Credit Officer.
 * Branch Manager and Assistant Branch Manager (ABM) are the same level with the same operational functionality in tracking.
 */
/**
 * The backend may also send other role names (e.g. Zonal Head, Manager, Director); they have no rank in tracking, so no rights
 * in the web's role rules, and are listed under their own name.
 */
export type OfficerRole = 'Divisional Manager' | 'Area Manager' | 'Branch Manager' | 'Assistant Branch Manager' | 'Credit Officer';

/**
 * Roles with Admin access in tracking (13 Nov 2026), above every field role, all equal: **Super Admin** comes as `Admin`;
 * an **Application Administrator** comes as one of the head-office roles below.
 */
export type AdminRole =
  | 'Admin'
  | 'Executive Officer'
  | 'Manager'
  | 'Assistant Manager'
  | 'Executive'
  | 'Director'
  | 'Vice President'
  | 'Office Assistant'
  | 'Auditor'
  | 'Managing Director';

/** Role of the person using the web app (`GET me`). */
export type ViewerRole = AdminRole | OfficerRole;

export const ADMIN_ROLES: readonly AdminRole[] = [
  'Admin',
  'Executive Officer',
  'Manager',
  'Assistant Manager',
  'Executive',
  'Director',
  'Vice President',
  'Office Assistant',
  'Auditor',
  'Managing Director',
];

/** True for every Admin role (Super Admin = `Admin`, or an Application Administrator role); equal access in tracking. */
export function isAdminRole(role: string | null | undefined): role is AdminRole {
  return ADMIN_ROLES.includes(role as AdminRole);
}

/**
 * The signed-in user as tracking sees them, built by `TrackingViewerStore` from GET app-api/users/login-info
 * (`EmployeeProfileResponse`; replaced GET tracking-api/me on 10 Nov 2026).
 */
export interface TrackingViewer {
  /** Employee id; null for an administrator without an employee record. */
  employeeId: string | null;
  name: string;
  role: ViewerRole;
  /** Branch, area or division they are in charge of ("All branches" for admins). */
  unitName: string;
  /** Branch ids in their scope: own branch (BM / ABM / CO), area (AM), division (DM), every branch (Admin). */
  organisationUnitIds: string[];
  /** True when there is anyone below them to give work to (false for a CO). */
  canCreateJobs: boolean;
}

/** A branch as a reference (id + name). */
export interface OrganisationUnitRef {
  id: string;
  name: string;
}

/** Branch ids of an officer (`organisationUnits[].id`). */
export function unitIdsOf(o: Pick<FieldOfficer, 'organisationUnits'>): string[] {
  return o.organisationUnits.map((u) => u.id);
}

/**
 * A field employee the current user may monitor (A3, GET tracking-api/field-officers?organizationUnitId=); names as the
 * API sends them. `canAssign` says whether the caller may also give them work.
 */
export interface FieldOfficer {
  id: string;
  employeeCode: string;
  name: string;
  role: OfficerRole;
  designation: string;
  /** Posting branch id (for AM / DM: the branch their office is in). */
  organisationUnitId: string;
  /** Posting branch name. */
  organisationUnitName: string;
  /** Branch, area or division name the person is in charge of / posted to. */
  unitName: string;
  /** Branches the person may work in: one for CO / ABM / BM, every branch of the area / division for AM / DM. */
  organisationUnits: OrganisationUnitRef[];
  phone: string;
  /** Geo-tagged present (home) address, used for the 50 m "near home" rule and the home pin. Null until captured. */
  presentLocation: GeoPoint | null;
  reportingOfficerName: string | null;
  /**
   * True when the caller may give this person work (a lower role in their scope). False = monitor only: listed because
   * the caller oversees their jobs (a BM sees the ABM of their branch), but never offered in Assign to / Transfer to.
   */
  canAssign: boolean;
}
