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

// Response of GET candidates/{id}/joining-letter-status. Read separately from ICandidate since it's not
// part of USP_GetInterviewCandidateById's output.
export interface ICandidateJoiningLetterStatus {
  isUploaded: boolean;
  fileUrl?: string | null;
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
  motherName?: string;

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

  isOfferLetterReceived?: boolean;

  isAppointmentLetterReceived?: boolean;

  isWelcomeLetterRecieved?: boolean;

  /** Candidate's signed/returned joining letter has been uploaded (backend
   * SignedJoiningLetterFile is set). Drives Appointment Letter -> Joining Letter ->
   * Welcome Letter visibility together with isAppointmentLetterReceived / isWelcomeLetterRecieved. */
  isJoiningLetterUploaded?: boolean;

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

  /** The candidate's `AssessmentType = 'HR'` row has been finalised. Distinct from any interviewer
   * submission made by the same HR employee. */
  isHrAssessmentSubmitted?: boolean;

  /** The signed-in employee owns the candidate's `AssessmentType = 'HR'` row. Independent of
   * `isCurrentEmployeePanelMember` - an HR employee who also sits on the panel is both. */
  isCurrentEmployeeHrAssessor?: boolean;

  /** What the signed-in employee is on this candidate, straight from `Tbl_InterviewPanel.AssessmentType`:
   * `'INTERVIEWER'`, `'HR'`, `'BOTH'`, or undefined when they hold no row. Always branch on this (or on
   * `isCurrentEmployeePanelMember` / `isCurrentEmployeeHrAssessor`) rather than on `isHR`, which only says
   * the user has HR permissions. */
  currentEmployeeAssessmentType?: 'INTERVIEWER' | 'HR' | 'BOTH';

  // ============================================================
  // POST-OFFER DOCUMENT CHAIN
  //
  // Sequenced server-side - each flag turns on only once the previous step's
  // letter has been received, so the template never re-derives the order:
  //   verification done -> offer -> (additional info + appointment)
  //   -> joining letter -> welcome letter.
  // ============================================================

  /** HR may view/print, send and mark received the interview letter. */
  showInterviewLetterActions?: boolean;

  /** The filled-in written interview form is on file. */
  isWrittenAssessmentUploaded?: boolean;

  /** Show the interview format download/upload pair: all interviewers acknowledged, the form is not on
   * file yet, and the HR Assessment is not complete. */
  showInterviewFormatActions?: boolean;

  /** Candidate verification is complete and the offer letter is not yet received. */
  showOfferLetterActions?: boolean;

  /** The offer letter is with the candidate - "Add Additional Info" is available. */
  showAddAdditionalInfoButton?: boolean;

  /** Offer received, appointment letter not yet received. */
  showAppointmentLetterActions?: boolean;

  /** Appointment letter received - joining letter download/upload is available. */
  showJoiningLetterActions?: boolean;

  /** Signed joining letter uploaded, welcome letter not yet received.
   * (isJoiningLetterUploaded and the three received flags are declared under
   * LETTER STATUS above.) */
  showWelcomeLetterActions?: boolean;

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
  //
  // There is no "generated" state - every letter is rendered on demand by
  // View & Print. A letter's only state is "received", so the offer letter is
  // driven by showOfferLetterActions / isOfferLetterReceived (LETTER STATUS).
  // ============================================================

  // ============================================================
  // CURRENT WORKFLOW
  // ============================================================

  currentWorkflowStage?: string;

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
// Replace the old ICandidateUpdate at the bottom of candidate.ts with this:

export interface ICandidateUpdate {
  id: string;
  // ============================================================
  // 1. BASIC INFORMATION
  // ============================================================
  prefix: string;
  firstName: string;
  middleName: string;
  lastName: string;
  employeeName: string;
  fatherName: string;
  motherName: string;
  dateOfBirth: string | null;
  gender: string;
  religion: string;
  caste: string;
  bloodGroup: string;
  disabilityType: string;
  nationality: string;
  // ============================================================
  // 2. KYC DETAILS
  // ============================================================
  panNumber: string;
  aadharNumber: string;
  voterIdNumber: string;
  passportNumber: string;
  passportValidityFrom: string | null;
  passportValidityTo: string | null;
  drivingLicenseNumber: string;
  drivingLicenseExpiryDate: string | null;

  // ============================================================
  // 3. CONTACT DETAILS
  // ============================================================
  mobileNo: string;
  personalEmail: string;
  primaryEmergencyRelation: string;
  primaryEmergencyName: string;
  primaryEmergencyMobile: string; // maps to nullable string
  secondaryEmergencyRelation: string;
  secondaryEmergencyName: string;
  secondaryEmergencyMobile: string;

  // ============================================================
  // 4. ADDRESS DETAILS
  // ============================================================
  presentAddressInfo: ICandidateAddressInfo;
  permanentAddressInfo: ICandidateAddressInfo;
  isSameAsPresentAddress: boolean;

  // ============================================================
  // 5. EDUCATION DETAILS
  // ============================================================
  latestQualification: string;
  academicStream: string;
  specialization: string;
  yearOfPassing: string | number | null;
  universityOrBoard: string;
  collegeOrSchool: string;
  gradeOrCgpaOrPercentage: string;

  // ============================================================
  // 6. PROFESSIONAL EXPERIENCE
  // ============================================================
  experiences: IExperienceInfo[];

  // ============================================================
  // 7. FAMILY DETAILS
  // ============================================================
  maritalStatus: string;
  spouseName: string;

  // ============================================================
  // 8. DEPENDENT & NOMINEE DETAILS
  // ============================================================
  nominees: INomineeInfo[];

  // ============================================================
  // 9. BANK DETAILS
  // ============================================================
  accountNumber: string;
  ifscCode: string;
  bankHolderName: string;
  bankName: string;
  branchName: string;
  accountType: string;

  // ============================================================
  // 10. REFERENCE DETAILS
  // ============================================================
  references: IReferenceInfo[];

  // ============================================================
  // 11. EMPLOYEE REFERRAL INFORMATION
  // ============================================================
  isReferred: boolean;
  referralEmployeeName: string;
  referralDesignation: string;
  referralEmployeeCode: string;
  referralHowDoYouKnow: string;
}

// ============================================================
// REQUIRED SUB-INTERFACES FOR NESTED/ARRAY DATA
// ============================================================

export interface ICandidateAddressInfo {
  houseNo: string;
  roadName: string;
  landMark: string;
  administrativeUnitId: string;
  policeStationId: string;
  postOfficeId: string;
  pinCode: string;
  ownerShipOfHouse: string;
  durationOfStayInMonths: number;
}

export interface IExperienceInfo {
  id?: string;
  previousEmployer: string;
  designation: string;
  fromDate: string | null;
  toDate: string | null;
  jobTitle: string;
  hasExperienceCertificate: boolean | null;
  hasNoc: boolean | null;
}

export interface INomineeInfo {
  id?: string;
  name: string;
  relation: string;
  dateOfBirth: string | null;
  uhidOrAbhaNumber: string;
  abhaAddress: string;
  uan: string;
  aadharNumber: string;
  voterIdNumber: string;
  isResidingWithIp: boolean | null;
  state: string;
  district: string;
  percentage: number | null;
}

export interface IReferenceInfo {
  id?: string;
  name: string;
  contactNumber: string;
  address: string;
  occupation: string;
  howDoYouKnowHimHer: string;
}
