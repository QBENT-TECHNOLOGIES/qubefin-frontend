export interface IApprovalWorkflow {
  id: string;
  category: string;
  organizationUnitTypeId: string | null;
  leaveTypeId: string | null;
  postId: string | null;
  salaryGradeId: string | null;
  minimumDays: number;
  maximumDays: number;

  leaveTypeName?: string | null;
  salaryGradeName?: string | null;
  organizationUnitTypeName?: string | null;
  postName?: string | null;
  createdByName?: string | null;
  lastModifiedByName?: string | null;

  createdOn?: Date;
  lastModifiedOn?: Date | null;
  steps?: IApprovalWorkflowStep[];
  stepPost?: string | null;
  approvalSteps: IApprovalStep[];
}

export interface IApprovalWorkflowStep {
  id: string;
  approvalWorkflowId: string;
  organizationUnitTypeId: string | null;
  organizationUnitType: string;
  receiverPostId: string | null;
  isRecommendEvent: boolean;
  isApprovalEvent: boolean;
  eventStatus: string;
  eventButtonText: string;
  sequenceNo: number;

  organizationUnitTypeName?: string | null;
  receiverPostName?: string | null;
}
export interface IApprovalWorkflowDetail {
  id: string;
  category: string;
  leaveTypeId: string | null;
  minimumDays: number;
  maximumDays: number;
  approvalSteps: IApprovalStep[];
}
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

  organizationUnitTypeName?: string | null;
}
