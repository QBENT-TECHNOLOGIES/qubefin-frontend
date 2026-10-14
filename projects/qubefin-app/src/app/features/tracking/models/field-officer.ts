import { GeoPoint } from './geo';

/** CO = Credit Officer, BM = Branch Manager, AM = Area Manager, DM = Divisional Manager. */
export type OfficerRole = 'CO' | 'BM' | 'AM' | 'DM';

/** A field employee the current user is allowed to assign work to or monitor. */
export interface FieldOfficer {
  id: string;
  employeeCode: string;
  name: string;
  role: OfficerRole;
  designation: string;
  branchId: string;
  branchName: string;
  phone: string;
  /** Geo-tagged residence used for the 50 m "near home" rule. */
  homeLocation: GeoPoint | null;
  reportingOfficerName: string | null;
}
