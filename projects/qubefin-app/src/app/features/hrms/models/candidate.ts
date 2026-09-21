export interface ICandidateList {
  id: string;
  fullName: string;
  interviewPost: string;
  interviewDate: string;
  interviewTime: string;
  recommendationStatus: string;
  referenceNo: string;
}
export interface ICandidateSearchModel {
  tempSearch: string;
  companyId: string;
}

// Send exactly one non-null flag per request; the rest should be left undefined.
// Mirrors backend `CandidateLetterStatusRequest`.
export interface ICandidateLetterStatusRequest {
  isInterviewLetterReceived?: boolean;
  isOfferLetterReceived?: boolean;
  isAppointmentLetterReceived?: boolean;
  isWelcomeLetterReceived?: boolean;
}

export interface ICandidate {
  // ============================================================
  // BASIC INFORMATION
  // ============================================================

  id: string;

  referenceNo?: string;

  firstName: string;
  middleName?: string;
  lastName: string;

  candidateFullName?: string;

  gender: string;
  fatherName?: string;

  mobileNo: string;
  email?: string;

  // ============================================================
  // ADDRESS
  // ============================================================

  houseNo?: string;
  roadName?: string;
  landMark?: string;

  administrativeUnitId?: string;
  policeStationId?: string;
  postOfficeId?: string;

  pinCode?: string;

  location?: string;

  // ============================================================
  // COMPANY
  // ============================================================

  companyId?: string;
  companyName?: string;

  // ============================================================
  // INTERVIEW INFORMATION
  // ============================================================

  interviewDate: string;
  interviewTime?: string;

  writtenInterviewFIle?: string;

  departmentId?: string;
  departmentName?: string;

  interviewPost: string;
  interviewPostName: string;

  venueOrganizationUnitId?: string;
  venue?: string;

  interviewMode?: string;

  referedBy?: string;

  // ============================================================
  // SALARY / JOINING
  // ============================================================

  currentSalary?: number;
  expectedSalary?: number;

  noticePeriodInDays?: number;

  earliestJoiningDate?: string;

  isWillingRelocate: boolean;

  preferredLocation?: string;

  // ============================================================
  // HR / INTERVIEW ASSESSMENT
  // ============================================================

  overallPerformance?: string;

  suitableRoleDepartment?: string;

  recommendedGradeId?: string;
  recommendedGradeName?: string;

  isTrainingRequired: boolean;

  recommendationStatus?: string;

  totalRatingPoint?: number;

  ratingStatus?: string;

  // ============================================================
  // RECRUITMENT
  // ============================================================

  recruitmentSource?: string;

  vacancyReference?: string;

  // ============================================================
  // VERIFICATION
  // ============================================================

  aadharNumber?: string;
  isAadharValidated: boolean;

  voterNumber?: string;
  isVoterValited: boolean;

  pan?: string;
  isPanValidated: boolean;

  isMobileValidated: boolean;

  uan?: string;
  isUanVerified: boolean;

  isCreditBureauChecked: boolean;

  creditBureauReportLink?: string;

  // ============================================================
  // POSTING / JOINING
  // ============================================================

  postedOrganizationUnitId?: string;

  postedOrganizationUnitName?: string;

  dateOfJoining?: string;

  reportingTime?: string;

  monthlyCostCompany?: number;

  // ============================================================
  // LETTER STATUS
  // ============================================================

  isInterviewLetterRecieved?: boolean;

  isOfferLetterReceived?: boolean;

  isAppointmentLetterReceived?: boolean;

  isWelcomeLetterRecieved?: boolean;

  // ============================================================
  // AUDIT
  // ============================================================

  createdBy?: string;
  createdOn?: string;

  modifiedBy?: string;
  modifiedOn?: string;

  // ============================================================
  // WORKFLOW / ROLE
  // ============================================================

  isHR?: boolean;

  isInterviewLetterReceived?: boolean;

  isInterviewerAcknowledged?: boolean;

  // ============================================================
  // PANEL
  // ============================================================

  showCreatePanelButton?: boolean;

  isPanelCreated?: boolean;

  panelMemberCount?: number;

  isCurrentEmployeePanelMember?: boolean;

  canAcknowledgePanel?: boolean;

  isCurrentEmployeeAttended?: boolean;

  isCurrentEmployeeAssessmentSubmitted?: boolean;
  isAssessmentDate?: boolean;

  isAllPanelAcknowledged?: boolean;

  isAllPanelAssessmentSubmitted?: boolean;

  /** How many interviewers have acknowledged so far. Excludes HR's own assessment row, so it can be
   * compared directly against `panelMemberCount`. */
  interviewerAcknowledgedCount?: number;

  /** How many interviewers have submitted their assessment so far. Excludes HR's own assessment row, so
   * it can be compared directly against `panelMemberCount`. */
  interviewerSubmittedCount?: number;

  // ============================================================
  // HR ASSESSMENT
  // ============================================================

  isShowHrAssessmentButton?: boolean;

  isHrAssessmentCompleted?: boolean;

  /** HR opened the HR Assessment and saved it as a draft without submitting. `isShowHrAssessmentButton`
   * stays true in this state - use this to label the button "Continue HR Assessment". */
  isHrAssessmentDraftSaved?: boolean;

  /** HR's own row in the interview panel table has been finalised. */
  isHrAssessmentSubmitted?: boolean;

  /** Total of the ten averaged category ratings stored on HR's assessment row. */
  hrAssessmentTotalRatingPoint?: number;

  isCandidateQualified?: boolean;

  // ============================================================
  // CANDIDATE VERIFICATION
  // ============================================================

  isShowCandidateVerificationButton?: boolean;

  isCandidateVerificationCompleted?: boolean;

  // ============================================================
  // OFFER LETTER
  // ============================================================

  canGenerateOfferLetter?: boolean;

  isOfferLetterGenerated?: boolean;

  // ============================================================
  // APPOINTMENT LETTER
  // ============================================================

  canGenerateAppointmentLetter?: boolean;

  // ============================================================
  // CURRENT WORKFLOW
  // ============================================================

  currentWorkflowStage?: string;

  // ============================================================
  // LEGACY FLAGS
  // ============================================================

  isInterviewerAcknowledgedOld?: boolean;

  oldIsShowHrAssessmentButton?: boolean;

  showViewPanelButton?: boolean;
}
export interface ICandidateDetail {
  firstName: string;
  middleName: string;
  lastName: string;
  gender: string;
  mobileNo: string;
  email: string;
  fatherName: string;

  companyId: string;
  interviewPost: string;
  departmentId: string;
  VenueOrganizationUnitId: string;
  interviewDate: string;
  interviewTime: string;

  houseNo: string;
  roadName: string;
  landMark: string;
  administrativeUnitId: string;
  policeStationId: string;
  postOfficeId: string;
  pinCode: string;
}
