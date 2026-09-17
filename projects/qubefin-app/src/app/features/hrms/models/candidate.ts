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

  isAllPanelAcknowledged?: boolean;

  isAllPanelAssessmentSubmitted?: boolean;

  // ============================================================
  // HR ASSESSMENT
  // ============================================================

  isShowHrAssessmentButton?: boolean;

  isHrAssessmentCompleted?: boolean;

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
