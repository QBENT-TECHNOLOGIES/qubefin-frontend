// What the Create Branch window needs, and what the survey page shows after the branch exists.
export interface IBranchCreateInfo {
  surveyId: string;
  canCreate: boolean;
  suggestedName: string;
  stateId: string | null;
  stateName: string | null;
  districtId: string | null;
  districtName: string | null;
  latitude: number | null;
  longitude: number | null;
  branchId: string | null;
  branchName: string | null;
  branchCode: number | null;
}

export interface ICreateBranchRequest {
  name: string;
  parentId: string;
  companyId: string;
  districtId: string;
  latitude: number | null;
  longitude: number | null;
  // "HH:mm:ss" or null.
  attendanceInTime: string | null;
  attendanceOutTime: string | null;
  checkRadiusInMeter: number | null;
}
