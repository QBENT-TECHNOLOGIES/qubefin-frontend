export interface IInterviewPanelDto {
  id: string;
  candidateId: string;
  employeeId: string;
  scheduledDate: string; // DateOnly mapped to string for Angular
  scheduledTime: string; // TimeOnly mapped to string for Angular
  isAcknowledged: boolean;
  acknowledgedDate?: string; // DateTime mapped to string
  /** Whether the CANDIDATE attended (recorded by this interviewer at Start Assessment). */
  isAttened: boolean;
  /** "Present", or the interviewer's reason the candidate was absent. Null until recorded. */
  attenedRemarks?: string | null;
  isSubmitted: boolean;
  submissionDate?: string; // DateTime mapped to string
  totalRatingPoint?: number;
  isRecommendedForPosition?: boolean;
}

export interface IPanelistScheduleDto {
  employeeId: string;
  scheduledDate: string;
  scheduledTime: string;
}

/** Full assessment detail for a single panelist against a candidate - returned by CandidateId + EmployeeId. */
export interface IInterviewAssessmentDto {
  id: string;
  candidateId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  designation: string;
  isAcknowledged: boolean;
  acknowledgedDate?: string;
  isAttened: boolean;
  attenedRemarks?: string | null;
  isSubmitted: boolean;
  submissionDate?: string;

  appearanceAttitudeRating?: number;
  appearanceAttitudeRemarks?: string;

  personalityRating?: number;
  personalityRemarks?: string;

  communicationRating?: number;
  communicationRemarks?: string;

  educationRating?: number;
  educationRemarks?: string;

  workExperienceRating?: number;
  workExperienceRemarks?: string;

  technicalCompetenceRating?: number;
  technicalCompetenceRemarks?: string;

  flexibilityRating?: number;
  flexibilityRemarks?: string;

  ambitionRating?: number;
  ambitionRemarks?: string;

  potentialRating?: number;
  potentialRemarks?: string;

  othersRating?: number;
  othersRemarks?: string;

  totalRatingPoint?: number;
  anyOtherJobsSuitedRemarks?: string;
  isRecommendedForPosition?: boolean;
  positiveRemarks?: string;
  negativeRemarks?: string;
}

/** Body shape expected by the assessment submit/draft endpoints - the ratings are nested under `assessment`
 * to match the backend's `SubmitInterviewAssessmentCommand` / `SaveInterviewAssessmentDraftCommand`. */
export interface IAssessmentRequest {
  candidateId: string;
  assessment: IAssessmentSubmitDto;
}

export interface IAssessmentSubmitDto {
  appearanceAttitudeRating?: number;
  appearanceAttitudeRemarks?: string;

  personalityRating?: number;
  personalityRemarks?: string;

  communicationRating?: number;
  communicationRemarks?: string;

  educationRating?: number;
  educationRemarks?: string;

  workExperienceRating?: number;
  workExperienceRemarks?: string;

  technicalCompetenceRating?: number;
  technicalCompetenceRemarks?: string;

  flexibilityRating?: number;
  flexibilityRemarks?: string;

  ambitionRating?: number;
  ambitionRemarks?: string;

  potentialRating?: number;
  potentialRemarks?: string;

  othersRating?: number;
  othersRemarks?: string;

  anyOtherJobsSuitedRemarks?: string;

  isRecommendedForPosition?: boolean;

  positiveRemarks?: string;
  negativeRemarks?: string;
}

// Interview page statuses - decided by Hrms.USP_GetInterviewerCandidateList.
export const INTERVIEW_STATUSES = [
  'Acknowledgement Pending',
  'Acknowledged',
  'Started Assessment',
  'Assessment Completed',
  'Interview Closed',
] as const;

export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];

/** One of the signed-in interviewer's own interviews. Mirrors backend `InterviewerCandidateDto`. */
export interface IInterviewerCandidate {
  panelId: string;
  candidateId: string;
  fullName: string;
  referenceNo: string | null;
  interviewPost: string | null;
  companyName: string | null;
  applicationDate: string | null;
  interviewDate: string | null;
  interviewTime: string | null;
  status: InterviewStatus;
  /** The interviewer recorded the candidate absent - nothing to assess. */
  isCandidateAbsent: boolean;
  attenedRemarks: string | null;
  canAcknowledge: boolean;
  canStartAssessment: boolean;
  canContinueAssessment: boolean;
  canViewAssessment: boolean;
  cvFileUrl: string | null;
}

/** Counts behind the Interview page's quick tabs (they follow the search / date filters). */
export interface IInterviewerTabCounts {
  allOpen: number;
  today: number;
  acknowledgementPending: number;
  completed: number;
}

/** Quick tabs: '' = all open, 'Today', or a row status. */
export type InterviewTab = '' | 'Today' | 'Acknowledgement Pending' | 'Assessment Completed';

export interface IInterviewerCandidateFilters {
  searchText: string;
  status: string | null;
  interviewDate: string | null;
}
