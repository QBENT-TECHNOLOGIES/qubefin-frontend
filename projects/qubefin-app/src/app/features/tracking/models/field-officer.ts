import { GeoPoint } from './geo';

/**
 * Field roles, top to bottom (all of them are tracked):
 * DM = Division Manager > AM = Area Manager > BM = Branch Manager > ABM = Assistant Branch Manager > CO = Credit Officer.
 */
export type OfficerRole = 'CO' | 'ABM' | 'BM' | 'AM' | 'DM';

/**
 * Role of the person using the web app. `Admin` = Super Admin or Application Administrator:
 * both have the same access in tracking and sit above every field role.
 */
export type ViewerRole = 'Admin' | OfficerRole;

/** The signed-in user as tracking sees them (GET tracking-api/me). */
export interface TrackingViewer {
  /** Employee id; null for an administrator without an employee record. */
  employeeId: string | null;
  name: string;
  role: ViewerRole;
  /** Branch, area or division they are in charge of ("All branches" for admins). */
  unitName: string;
  /** Branches in their scope: own branch (BM / ABM / CO), area (AM), division (DM), every branch (Admin). */
  branchIds: string[];
  /** True when there is anyone below them to give work to (false for a CO). */
  canCreateJobs: boolean;
}

/** A field employee the current user is allowed to assign work to or monitor. */
export interface FieldOfficer {
  id: string;
  employeeCode: string;
  name: string;
  role: OfficerRole;
  designation: string;
  /** Posting branch (for AM / DM: the branch their office is in). */
  branchId: string;
  branchName: string;
  /** Branch, area or division name the person is in charge of / posted to. */
  unitName: string;
  /** Branches the person may work in: one for CO / ABM / BM, every branch of the area / division for AM / DM. */
  branchIds: string[];
  phone: string;
  /** Geo-tagged residence used for the 50 m "near home" rule. */
  homeLocation: GeoPoint | null;
  reportingOfficerName: string | null;
}
