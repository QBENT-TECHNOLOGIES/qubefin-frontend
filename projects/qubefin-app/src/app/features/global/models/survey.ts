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
  assignmentDate: Date | string;
  proposedArea: string;
  administrativeUnitId: string;
  administrativeUnitName: string | null;
  tentativeSubmissionDate: Date | null | string;
  surveyAssigneds: ISurveyMembers[];
  isSurveyAccessed: boolean;
}

export interface SurveyCreateDetail {
  id: string;
  sequence: number;
  surveyType: string;
  assignmentNo: string;
  assignmentDate: Date | string;
  proposedArea: string;
  administrativeUnitId: string;
  administrativeUnitName: string | null;
  tentativeSubmissionDate: Date | null | string;
  surveyAssigneds: ISurveyMembers[];
}

export interface ISurveyMembers {
  id: string;
  employeeId: string;
  employeeName: string | null;
  isLead: boolean;
}
