export interface IApprovalWorkflow {
	id: string;
	category: string;
	leaveTypeId: string | null;
	organizationUnitTypeId: string | null;
	salaryGradeId: string | null;
	postId: string | null;
	minimumDays: number;
	maximumDays: number | null;

	leaveTypeName?: string | null;
	salaryGradeName?: string | null;
	organizationUnitTypeName?: string | null;
	postName?: string | null;
	steps?: IApprovalWorkflowStep[];
	stepPost?: string | null;

	createdOn: Date;
	createdBy: string;
	lastModifiedOn: Date | null;
	lastModifiedBy: string | null;
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

	receiverPostName ?: string | null;
}