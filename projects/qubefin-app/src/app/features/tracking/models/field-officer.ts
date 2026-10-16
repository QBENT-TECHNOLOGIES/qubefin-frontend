import { GeoPoint } from './geo';

/**
 * Position hierarchy, top to bottom:
 * DM = Divisional Manager > AM = Area Manager > BM = Branch Manager > ABM = Assistant Branch Manager > CO = Credit Officer.
 */
export type OfficerRole = 'CO' | 'ABM' | 'BM' | 'AM' | 'DM';

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
