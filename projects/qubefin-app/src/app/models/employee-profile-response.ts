/**
 * GET app-api/users/login-info: the signed-in user. Also carries the tracking scope (role, unit, branches, canCreateJobs),
 * which replaced GET tracking-api/me (10 Nov 2026). Names exactly as the API sends them.
 */
export interface EmployeeProfileResponse {
  id: string;
  userName: string;
  employeeId: string;
  employee: string;
  gender: string;
  employeeCode: string;
  designation: string;
  companyLogoUrl: string;
  isMileageEnabled: boolean;
  isLoginRequired: boolean;
  /** Branches in the user's scope: own branch (BM / ABM / CO), area (AM), division (DM), every branch (Admin). */
  accessOrganizationUnits: AccessOrganizationUnit[];
  /** Role name, e.g. "Area Manager" (`ViewerRole` in tracking). */
  role: string;
  /** Branch, area or division they are in charge of. */
  unitName: string;
  /** True when there is anyone below them to give tracking work to (false for a Credit Officer). */
  canCreateJobs: boolean;
}

export interface AccessOrganizationUnit {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  attendanceInTime: string;
  attendanceOutTime: string;
  checkRadiusInMeter: number;
}
