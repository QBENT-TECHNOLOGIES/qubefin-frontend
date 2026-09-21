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
}
