export interface ICandidateList {
  id: string;
  fullName: string;
  interviewPost: string;
  interviewDate: string;
  interviewTime: string;
  recommendationStatus: string;
  referenceNo: string;
  interviewStatus: CandidateInterviewStatus;
}

// Stages shown in the candidate list, in order: HR assessment submitted -> offer letter received -> signed
// joining letter uploaded. A candidate HR did not recommend stops at 'Rejected'. Must match
// CandidateInterviewStatus on the API.
export type CandidateInterviewStatus =
  | 'Interview in Progress'
  | 'Rejected'
  | 'Candidate Verification in Progress'
  | 'Joining in Progress'
  | 'Joined';
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

  /** An employee has been created from the candidate's joining information - the welcome letter opens only then. */
  isEmployeeCreated?: boolean;

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
