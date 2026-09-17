export interface IInterviewPanelDto {
  id: string;
  candidateId: string;
  employeeId: string;
  scheduledDate: string; // DateOnly mapped to string for Angular
  scheduledTime: string; // TimeOnly mapped to string for Angular
  isAcknowledged: boolean;
  acknowledgedDate?: string; // DateTime mapped to string
  isAttened: boolean;
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

export interface IAssessmentSubmitDto {
  panelId: string;

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
