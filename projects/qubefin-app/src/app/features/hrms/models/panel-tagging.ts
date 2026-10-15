// Panel Tagging. A panel is not stored on its own: it is the candidates who share the same interview date,
// venue organization unit and exact set of panelists. Mirrors InterviewPanelTaggingDtos on the API.

export interface IPanelBoardSearch {
  dateFrom: string | null;
  dateTo: string | null;
  venueOrganizationUnitId: string | null;
  companyId: string | null;
}

/** Every panel and untagged candidate for one interview date at one venue. */
export interface IPanelSlot {
  interviewDate: string;
  venueOrganizationUnitId: string;
  venueName: string;
  isPast: boolean;
  panels: IPanelGroup[];
  untaggedCandidates: IPanelCandidate[];
}

export interface IPanelGroup {
  /** The panelists' employee ids - identifies the panel within its slot. */
  panelKey: string;
  members: IPanelMember[];
  candidates: IPanelCandidate[];
}

export interface IPanelMember {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  designation: string | null;
}

export interface IPanelCandidate {
  candidateId: string;
  fullName: string;
  referenceNo: string | null;
  interviewPost: string | null;
  interviewTime: string | null;
  panelistCount: number;
  acknowledgedCount: number;
  submittedCount: number;
  /** The interview has started (or the HR assessment is done) - the panel can no longer change. */
  isLocked: boolean;
  lockedReason: string | null;
}

/** A panelist as picked in the panelist picker (same shape as IEmployeeByOrgUnit). */
export interface IPanelistOption {
  id: string;
  name: string;
  code?: string;
  currentDesignation?: string | null;
}
