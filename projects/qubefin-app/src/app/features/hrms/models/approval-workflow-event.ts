export interface IApprovalWorkflowEvent {
  id: string;
  category: string;
  leaveTypeId: string | null;
  organizationUnitTypeId: string | null;
  salaryGradeId: string | null;
  postId: string | null;
  minimumDays: number;
  maximumDays: number | null;
  sequenceNo: number;
  receiverPostId: string;
  isRecommendEvent: boolean;
  isApprovalEvent: boolean;
  eventStatus: string;
  eventButtonText: string;

  leaveTypeName?: string | null;
  salaryGradeName?: string | null;
  organizationUnitTypeName?: string | null;
  postName?: string | null;
  receiverPostName?: string | null;
}

export interface IApprovalWorkflowEventGroupItem {
  category: string;
  organizationUnitTypeId: string;
  organizationUnitType: string;
  leaveTypeId: string | null;
  leaveType: string | null;
  salaryGradeId: string | null;
  SalaryGrade: string | null;
  minimumDays: number;
  maximumDays: number;
  rangeDays: string;
  workflowEventPath: string;
}