export interface IApprovalWorkflowListItem {
  id: string;
  category: string;
  organizationUnitTypeName: string | null;
  leaveTypeName: string | null;
  postName: string | null;
  salaryGradesName: string | null;
  minimumDays: number | null;
  maximumDays: number | null;
  rangeDaysDisplay: string; // server-computed "-" or "1 - 3"
  approvalPath: string;
}

// ============================================================================
// DETAIL / VIEW — maps 1:1 to ApprovalWorkflowDetail
// ============================================================================
export interface IApprovalWorkflowDetail {
  id: string;
  category: string;
  organizationUnitTypeId: string | null;
  leaveTypeId: string | null;
  postId: string | null;
  salaryGradeIds: string[] | null;
  minimumDays: number | null;
  maximumDays: number | null;
  leaveTypeName: string | null;
  salaryGradesName: string | null;
  organizationUnitTypeName: string | null;
  postName: string | null;
  createdByName: string | null;
  lastModifiedByName: string | null;
  createdOn: string | null;
  lastModifiedOn: string | null;
  // legacy field still present on the backend model — see note in detail component
  steps: IApprovalWorkflowStepLegacy[] | null;
  stepPost: string | null;
  approvalSteps: IApprovalStep[];
}

// Legacy `Steps` shape still on the backend DTO (distinct from ApprovalSteps).
// Kept only so the type compiles if something still reads `detail.steps`.
export interface IApprovalWorkflowStepLegacy {
  id: string;
  approvalWorkflowId: string;
  receiverPostId: string;
  organizationUnitTypeId: string;
  isRecommendEvent: boolean;
  isApprovalEvent: boolean;
  eventStatus: string;
  eventButtonText: string;
  sequenceNo: number;
  receiverPostName?: string | null;
}

// Maps 1:1 to ApprovalStep
export interface IApprovalStep {
  id: string;
  approvalWorkflowId: string;
  organizationUnitTypeId: string | null;
  receiverPostId: string;
  isRecommendEvent: boolean;
  isApprovalEvent: boolean;
  eventStatus: string;
  eventButtonText: string;
  sequenceNo: number;
  organizationUnitTypeName: string | null;
}

// ============================================================================
// CREATE / UPDATE REQUEST — maps 1:1 to ApprovalWorkflowRequest
// ============================================================================
export interface IApprovalWorkflowRequest {
  category: string;
  leaveTypeId: string | null;
  organizationUnitTypeId: string | null;
  salaryGradeIds: string[] | null;
  postId: string | null;
  minimumDays: number;
  maximumDays: number;
  steps: IApprovalWorkflowStepRequest[];
}

// Maps 1:1 to ApprovalWorkflowStepRequest
export interface IApprovalWorkflowStepRequest {
  id: string | null;
  receiverPostId: string;
  organizationUnitTypeId: string;
  isRecommendEvent: boolean;
  isApprovalEvent: boolean;
  eventStatus: string;
  eventButtonText: string;
  sequenceNo: number;
}

// ============================================================================
// FORM MODEL — shape the reactive form (`form()` / signal forms) is built on.
// This is a frontend-only convenience type; it is NOT sent to the API as-is.
// onSubmit() maps it into IApprovalWorkflowRequest before calling the service.
// ============================================================================
export interface IApprovalWorkflow {
  id: string;
  category: string;
  leaveTypeId: string | null;
  organizationUnitTypeId: string | null;
  postId: string | null;
  salaryGradeIds: string[];
  minimumDays: number;
  maximumDays: number;
  approvalSteps: IFormApprovalStep[];
}

// One step row while being edited in the form (id may be EMPTY_UUID for new rows)
export interface IFormApprovalStep {
  id: string;
  approvalWorkflowId: string;
  organizationUnitTypeId: string | null;
  receiverPostId: string;
  isRecommendEvent: boolean;
  isApprovalEvent: boolean;
  eventStatus: string;
  eventButtonText: string;
  sequenceNo: number;
}

// ============================================================================
// SEARCH — request params are unchanged from before (category / org unit type /
// salary grade / sort / paging). Included here for convenience.
// ============================================================================
export interface IApprovalWorkflowSearchParams {
  category?: string | null;
  organizationUnitTypeId?: string | null;
  salaryGradeId?: string | null;
  sortOn?: string;
  sortDirection?: 'asc' | 'desc';
  pageIndex?: number;
  pageSize?: number;
}
