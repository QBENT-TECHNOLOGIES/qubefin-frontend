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
}
