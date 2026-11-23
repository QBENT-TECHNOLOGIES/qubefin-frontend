export interface ISurveySearchResult {
  id: string;
  assignmentNo: string;
  assignmentDate: Date;
  surveyType: string;
  status: string;
  totalCount: number;
}

// Who created / last changed the survey (the server sends the names).
export interface ISurveyAuditInfo {
  createdBy: string | null;
  createdOn: Date | string | null;
  lastModifiedBy: string | null;
  lastModifiedOn: Date | string | null;
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
  status: string;
  surveyFormAttached: boolean;
  branchOrganizationUnitId: string | null;
  // Group Survey only: the name of the branch.
  branchName?: string | null;
  previousSurveyId: string | null;
  // The server says whether the logged-in user can edit the General Information (Committee Lead, before submit).
  canEditGeneral: boolean;
  // The server says whether the logged-in user can fill in the survey form (Lead Surveyor, before submit).
  canEditForm: boolean;
  auditInfo: ISurveyAuditInfo | null;
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

// Readable text for the status codes returned by the server.
const SURVEY_STATUS_LABELS: Record<string, string> = {
  Assigned: 'Assigned',
  Draft: 'Draft',
  PendingEvaluation: 'Pending Evaluation',
  EvaluationInProgress: 'Evaluation In Progress',
  PendingLeadEvaluation: 'Pending Lead Evaluation',
  PendingApproval: 'Pending Approval',
  Approved: 'Approved',
  Rejected: 'Rejected',
  BranchCreated: 'Branch Created',
};

export function getSurveyStatusLabel(status: string): string {
  return SURVEY_STATUS_LABELS[status] ?? status;
}

// What the logged-in user can create (Committee Lead: Branch Survey; person in charge of a branch: Group Survey).
export interface ICanCreateSurvey {
  canCreateBranchSurvey: boolean;
  canCreateGroupSurvey: boolean;
  inchargeBranchId: string | null;
  inchargeBranchName: string | null;
}

// A Credit Officer who can be assigned to a Group Survey.
export interface ICreditOfficer {
  id: string;
  employeeName: string;
}
