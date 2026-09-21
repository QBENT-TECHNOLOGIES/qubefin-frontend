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
