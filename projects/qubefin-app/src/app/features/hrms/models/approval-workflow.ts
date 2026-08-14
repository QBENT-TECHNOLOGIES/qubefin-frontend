export interface IApprovalWorkflow {
  id: string;
  category: string;
  leaveTypeId: string | null;
  organizationUnitTypeId?: string | null;
  salaryGradeId?: string | null;
  postId?: string | null;
  minimumDays: number;
  maximumDays: number;

  leaveTypeName?: string | null;
  salaryGradeName?: string | null;
  organizationUnitTypeName?: string | null;
  postName?: string | null;
  steps?: IApprovalWorkflowStep[];
  stepPost?: string | null;

  createdOn?: Date;
  createdBy?: string;
  lastModifiedOn?: Date | null;
  lastModifiedBy?: string | null;
  approvalSteps: IApprovalStep[];
}

export interface IApprovalWorkflowStep {
  id: string;
  approvalWorkflowId: string;
  organizationUnitType: string;
  receiverPostId: string | null;
  isRecommendEvent: boolean;
  isApprovalEvent: boolean;
  eventStatus: string;
  eventButtonText: string;
  sequenceNo: number;

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
  receiverPostId: string;
  isRecommendEvent: boolean;
  isApprovalEvent: boolean;
  eventStatus: string;
  eventButtonText: string;
}
