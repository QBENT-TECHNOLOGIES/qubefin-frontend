/** One submitted panelist's ratings, shown for HR's reference alongside the averages.
 * Mirrors backend `PanelistRatingSummaryDto`. */
export interface IPanelistRatingSummaryDto {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  designation: string;

  appearanceAttitudeRating?: number;
  personalityRating?: number;
  communicationRating?: number;
  educationRating?: number;
  workExperienceRating?: number;
  technicalCompetenceRating?: number;
  flexibilityRating?: number;
  ambitionRating?: number;
  potentialRating?: number;
  othersRating?: number;

  totalRatingPoint?: number;
  isRecommendedForPosition?: boolean;
}

/** Returned when HR opens the HR Assessment form for a candidate. Mirrors backend `HrAssessmentFormDto`.
 * The ten average* rating fields are read-only (average of every submitted panelist's score per
 * category) - only the fields below them are editable by HR. */
export interface IHrAssessmentFormDto {
  candidateId: string;
  isSubmitted: boolean;

  // True when HR has already submitted their own individual interviewer assessment (genuinely scheduled
  // on the panel, not just holding the administrative HR row).
  hrIsInterviewer: boolean;

  // True when hrIsInterviewer is true AND HR is the only interviewer on the panel - the fields shared with
  // the interviewer assessment form (ratings, isRecommendedForPosition, positiveRemarks, negativeRemarks,
  // anyOtherJobsSuitedRemarks) should render disabled, sourced from HR's own single submission. When
  // hrIsInterviewer is true but this is false, HR is one of several interviewers - those same fields stay
  // enabled/live (the average keeps updating as other panelists submit).
  isHrOnlyInterviewer: boolean;

  // Read-only: average of the submitted panelists' ratings per category.
  averageAppearanceAttitudeRating?: number;
  averagePersonalityRating?: number;
  averageCommunicationRating?: number;
  averageEducationRating?: number;
  averageWorkExperienceRating?: number;
  averageTechnicalCompetenceRating?: number;
  averageFlexibilityRating?: number;
  averageAmbitionRating?: number;
  averagePotentialRating?: number;
  averageOthersRating?: number;
  averageTotalRatingPoint?: number;

  // Editable by HR (pre-filled with whatever was last saved, if a draft/submission exists).
  overallPerformance?: string;
  suitableRoleDepartment?: string;
  recommendedGradeId?: string;
  isTrainingRequired: boolean;
  recommendationStatus?: string;
  anyOtherJobsSuitedRemarks?: string;
  isRecommendedForPosition?: boolean;
  positiveRemarks?: string;
  negativeRemarks?: string;

  // Salary & joining expectations. These live on the candidate, not the HR row - they may already have
  // been captured when the candidate was created, and HR confirms/corrects them on this form.
  currentSalary?: number;
  expectedSalary?: number;
  noticePeriodInDays?: number;
  earliestJoiningDate?: string;
  isWillingRelocate: boolean;
  preferredLocation?: string;

  // For reference - the individual panelists these averages were computed from.
  panelists: IPanelistRatingSummaryDto[];
}

/** Body for both the HR Assessment draft-save and submit endpoints. The ten category ratings are never
 * sent here - the server always (re)computes them as the average of the submitted panelists' ratings,
 * since they're read-only/disabled in the HR Assessment form. Mirrors backend `HrAssessmentDecisionDto`. */
export interface IHrAssessmentDecisionDto {
  overallPerformance?: string;
  suitableRoleDepartment?: string;
  recommendedGradeId?: string;
  isTrainingRequired: boolean;
  recommendationStatus?: string;
  anyOtherJobsSuitedRemarks?: string;
  isRecommendedForPosition?: boolean;
  positiveRemarks?: string;
  negativeRemarks?: string;

  // Salary & joining expectations, written straight to the candidate by both the draft and the submit.
  currentSalary?: number;
  expectedSalary?: number;
  noticePeriodInDays?: number;
  /** yyyy-MM-dd - the API takes a DateOnly. */
  earliestJoiningDate?: string;
  isWillingRelocate: boolean;
  preferredLocation?: string;
}
