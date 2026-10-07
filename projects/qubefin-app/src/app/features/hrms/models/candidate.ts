export interface ICandidateList {
  id: string;
  fullName: string;
  referenceNo: string;
  interviewPost: string;
  companyName: string;
  applicationDate: string | null;
  interviewDate: string | null;
  interviewTime: string | null;
  recommendationStatus: string;
  status: CandidateInterviewStatus;
  /** HR / Admin may add or move the interview date and time (until the HR Assessment is completed). */
  canSchedule: boolean;
  /** Uploaded files (CV, job application, written interview form, credit bureau report, signed joining letter)
   * the API offers at this status. */
  downloads?: ICandidateDownloadFile[];
}

export interface ICandidateDownloadFile {
  name: string;
  url: string;
}

// Candidate list statuses, derived from the workflow by Hrms.USP_GetCandidateList. Must match
// CandidateInterviewStatus on the API. The workflow stops at 'Rejected' or 'Not Selected'.
export const CANDIDATE_STATUSES = [
  'Schedule Pending',
  'Interview Scheduled but Letter not sent',
  'Interview Scheduled & Letter sent',
  'Interview in Progress',
  'HR Assessment Pending',
  'Selection Pending',
  'Candidate Verification in Progress',
  'Joining in Progress',
  'Joined',
  'Rejected',
  'Not Selected',
] as const;

export type CandidateInterviewStatus = (typeof CANDIDATE_STATUSES)[number];

// RecommendationStatus values: 'Pending' until HR decides, the HR Assessment outcomes, and 'Rejected'.
export const RECOMMENDATION_STATUSES = [
  'Pending',
  'Strongly Recommended',
  'Recommended',
  'Recommended with Training',
  'Hold for Future Opportunity',
  'Not Recommended',
  'Strongly Recommended but not selected',
  'Recommended but not selected',
  'Recommended with Training but not selected',
  'Rejected',
] as const;

export interface ICandidateSearchModel {
  tempSearch: string;
  companyId: string;
  applicationDateFrom: Date | '';
  applicationDateTo: Date | '';
  interviewDate: Date | '';
  recommendationStatus: string;
  status: string;
}

/** Applied Candidate list filters (dates as yyyy-MM-dd). */
export interface ICandidateFilters {
  searchText: string;
  companyId: string | null;
  applicationDateFrom: string | null;
  applicationDateTo: string | null;
  interviewDate: string | null;
  recommendationStatus: string | null;
  status: string | null;
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

// Which employee the candidate's joining information is saved into - null until the Personal step is saved -
// plus what the candidate record already holds. Once the employee exists the joining steps use the employee APIs;
// they fill the blanks from these values and show what Candidate Verification confirmed read-only.
export interface ICandidateJoiningInfo {
  candidateId: string;
  employeeId: string | null;
  employeeCode: string | null;
  mobileNo: string;
  isMobileValidated: boolean;
  email: string | null;
  aadharNumber: string | null;
  isAadharValidated: boolean;
  voterNumber: string | null;
  isVoterValidated: boolean;
  pan: string | null;
  isPanValidated: boolean;
  uan: string | null;
  isUanVerified: boolean;
  address: any | null;
  companyId: string | null;
  organizationUnitTypeId: string | null;
  organizationUnitId: string | null;
  departmentId: string | null;
  dateOfJoining: string | null;
  designationId: string | null;
}

// The candidate's number for a KYC document and whether it was verified. KYC document names come from
// configuration, so they are matched the same way the KYC step matches them for its number patterns.
export function candidateKycDocument(
  info: ICandidateJoiningInfo | null,
  documentName: string | null | undefined,
): { documentNo: string | null; isVerified: boolean } | null {
  if (!info) return null;
  const name = documentName?.toLowerCase() || '';
  if (name.includes('aadhaar') || name.includes('adhar')) {
    return { documentNo: info.aadharNumber, isVerified: info.isAadharValidated };
  }
  if (name.includes('pan')) {
    return { documentNo: info.pan, isVerified: info.isPanValidated };
  }
  if (name.includes('voter')) {
    return { documentNo: info.voterNumber, isVerified: info.isVoterValidated };
  }
  return null;
}

// Employee contact read model with the candidate's mobile/email where the employee has none; a verified
// mobile always wins.
export function withCandidateContact(resp: any, info: ICandidateJoiningInfo | null) {
  if (!info) return resp;
  return {
    ...resp,
    mobileNo: info.isMobileValidated || !resp?.mobileNo ? info.mobileNo : resp.mobileNo,
    personalEmail: resp?.personalEmail || info.email || '',
  };
}

// Employee address read model with the candidate's address (as both present and permanent) until an address
// has been saved on the employee.
export function withCandidateAddress(resp: any, info: ICandidateJoiningInfo | null) {
  const hasAddress =
    !!resp?.presentAddressInfo?.administrativeUnitId || !!resp?.permanentAddressInfo?.administrativeUnitId;
  if (!info?.address || hasAddress) return resp;
  return {
    ...resp,
    sameAsPresentAddress: true,
    presentAddressInfo: { ...info.address },
    permanentAddressInfo: { ...info.address },
  };
}

// Employee official read model with the candidate's company, posted office, department, joining date and
// designation until official info has been saved on the employee.
export function withCandidateOfficial(resp: any, info: ICandidateJoiningInfo | null) {
  if (!info || resp?.organizationUnitId) return resp;
  return {
    ...resp,
    companyId: resp?.companyId || info.companyId,
    organizationUnitTypeId: info.organizationUnitTypeId,
    organizationUnitId: info.organizationUnitId,
    departmentId: resp?.departmentId || info.departmentId,
    joiningDate: resp?.joiningDate || info.dateOfJoining,
    designationId:
      resp?.isDesignationEditable && !resp?.designationId ? info.designationId : resp?.designationId,
  };
}

// Employee payroll read model with the candidate's UAN where the employee has none; a verified UAN always wins.
export function withCandidateBanking(resp: any, info: ICandidateJoiningInfo | null) {
  if (!info?.uan) return resp;
  return {
    ...resp,
    universalAccountNumber:
      info.isUanVerified || !resp?.universalAccountNumber ? info.uan : resp.universalAccountNumber,
  };
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

  address?: string;
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

  applicationDate?: string | null;

  interviewDate?: string | null;
  interviewTime?: string | null;

  /** CV and job application - mandatory at creation. */
  cvFileUrl?: string | null;
  jobApplicationFileUrl?: string | null;

  writtenInterviewFIle?: string;

  /** Stored location of the uploaded, filled-in written interview form. Null until it is uploaded. */
  writtenInterviewFIleUrl?: string | null;

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

  /** Stored location of the candidate's signed joining letter. Null until it is uploaded. */
  signedJoiningLetterFileUrl?: string | null;

  // ============================================================
  // ROLES
  // ============================================================

  /** The signed-in employee holds the HR post. */
  isHR?: boolean;

  /** The signed-in employee created the candidate (and is not HR) - its Admin. */
  isAdmin?: boolean;

  /** The signed-in user may act right now: HR until the workflow stops, Admin only until HR saves the HR
   * Assessment draft (after that Admin can only view). */
  canAct?: boolean;

  canEditDetails?: boolean;

  isInterviewLetterReceived?: boolean;

  // ============================================================
  // PANEL
  // ============================================================

  showCreatePanelButton?: boolean;

  isPanelCreated?: boolean;

  panelMemberCount?: number;

  /** Add / remove panelists inside View Panel. A panelist who submitted can never be removed. */
  canModifyPanel?: boolean;

  isAllPanelAcknowledged?: boolean;

  /** Every panelist is finished: submitted, recorded the candidate absent, or the interview day passed. */
  isAllPanelAssessmentSubmitted?: boolean;

  interviewerAcknowledgedCount?: number;

  interviewerSubmittedCount?: number;

  /** Panelists who neither submitted nor recorded the candidate absent - HR is warned about them. */
  pendingPanelAssessmentCount?: number;

  // ============================================================
  // HR ASSESSMENT -> SELECTION
  // ============================================================

  isShowHrAssessmentButton?: boolean;

  isHrAssessmentCompleted?: boolean;

  /** HR saved the HR Assessment as a draft without submitting - label the button "Continue HR Assessment". */
  isHrAssessmentDraftSaved?: boolean;

  isHrAssessmentSubmitted?: boolean;

  /** HR picked the candidate for an offer - opens Candidate Verification. Never reverted. */
  isSelectedForOffer?: boolean;

  /** "Is Candidate Selected" - HR, HR Assessment submitted with a qualified outcome, not selected yet. */
  showSelectForOfferButton?: boolean;

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

  /** Place of posting, date of joining, reporting time and monthly CTC (above 0) are filled in. The offer letter
   * prints them, so it cannot be sent before. */
  isJoiningDetailsComplete?: boolean;

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

  /** An employee has been created from the candidate's joining information - the welcome letter opens only then. */
  isEmployeeCreated?: boolean;

  /** HR rejected the candidate. The workflow is stopped - the API refuses every further action. */
  isRejected?: boolean;

  /** HR submitted the assessment with an outcome that does not qualify (Hold / Not Recommended). The workflow
   * is stopped - the API refuses every further action. */
  isNotSelected?: boolean;

  /** HR, or Admin while it can still act, until the employee is created. */
  showRejectButton?: boolean;

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
  /** UI only: the (single, read-only) country the state list hangs off. */
  countryId: string;
  /** The selected State - stored as the candidate's AdministrativeUnitId. */
  administrativeUnitId: string;
  address: string;
  pinCode: string;

  // Joining details - edited on an existing candidate only.
  /** UI only: narrows the posted organization unit dropdown. Not stored on the candidate. */
  postedOrganizationUnitTypeId: string;
  postedOrganizationUnitId: string;
  dateOfJoining: string;
  reportingTime: string;
  monthlyCostCompany: string;
}
