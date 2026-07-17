export interface ISurveySearchResult {
  id: string;
  assignmentNo: string;
  assignmentDate: Date;
  surveyType: string;
  status: boolean;
  totalCount: number;
}

export interface ISurveyDetail {
  id: string;
  sequence: number;
  surveyType: string;
  assignmentNo: string;
  assignmentDate: Date;
  proposedArea: string;

  countryId: string;
  stateId: string;
  districtId: string;
  administrativeUnitId: string;

  administrativeUnitName: string | null;
  tentativeSubmissionDate: Date | null;
  surveyMembers: ISurveyMembers[];
}

export interface ISurveyMembers {
  employeeId: string;
  name: string | null;
  isLead: boolean;
}
