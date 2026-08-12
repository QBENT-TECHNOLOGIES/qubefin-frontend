import { Component, computed, inject, signal } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { ApprovalWorkflowEventList } from '../../components/approval-workflow-events/approval-workflow-event-list/approval-workflow-event-list';
import { ApprovalWorkflowEventStore } from '../../stores/approval-workflow-event-store';
import { CommonModule } from '@angular/common';
import { EMPTY_UUID } from 'qubefin-core';

@Component({
	selector: 'qfin-approval-workflow-event',
	imports: [
		CommonModule,
		LucideDynamicIcon,
		ApprovalWorkflowEventList
	],
	templateUrl: './approval-workflow-event.html',
})
export class ApprovalWorkflowEvent {
	protected readonly approvalWorkflowEventStore = inject(ApprovalWorkflowEventStore);

	isViewMode = signal<boolean>(true);
	workflowCategories = this.approvalWorkflowEventStore.approvalWorkflowEvents;
	public readonly EMPTY_UUID = EMPTY_UUID;
	selectedWorkflowEventId = signal<string>(EMPTY_UUID);

	hasSelectddWorkflowEvent = computed(() => this.selectedWorkflowEventId() !== EMPTY_UUID);

	// protected readonly categories = ['Leave', 'Organization Unit', 'Salary Grade', 'Post'];
	// protected readonly eventStatuses = ['Pending', 'Recommended', 'Approved', 'Rejected'];

	// protected readonly workflowEventModel = signal<IApprovalWorkflowEvent>({
	// 	id: '',
	// 	category: 'Leave',
	// 	leaveTypeId: '',
	// 	organizationUnitTypeId: '',
	// 	salaryGradeId: '',
	// 	postId: '',
	// 	minimumDays: 0,
	// 	maximumDays: null,
	// 	sequenceNo: 1,
	// 	receiverPostId: '',
	// 	isRecommendEvent: false,
	// 	isApprovalEvent: true,
	// 	eventStatus: 'Pending',
	// 	eventButtonText: 'Approve',
	// });

	// protected readonly workflowEventSchema: Schema<IApprovalWorkflowEvent> = schema(path => {
	// 	required(path.category, { message: 'Category is required' });
	// 	required(path.receiverPostId, { message: 'Receiver post is required' });
	// 	required(path.eventStatus, { message: 'Event status is required' });
	// 	required(path.eventButtonText, { message: 'Button text is required' });
	// });

	// protected readonly workflowEventForm = form(this.workflowEventModel, this.workflowEventSchema);

	// protected save(): void {
	// 	if (!this.workflowEventForm().valid()) {
	// 		return;
	// 	}

	// 	const value = this.workflowEventForm().value();
	// 	const workflowEvent: IApprovalWorkflowEvent = {
	// 		...value,
	// 		leaveTypeId: value.leaveTypeId || null,
	// 		organizationUnitTypeId: value.organizationUnitTypeId || null,
	// 		salaryGradeId: value.salaryGradeId || null,
	// 		postId: value.postId || null,
	// 	};
	// 	console.log('Approval workflow event', workflowEvent);
	// }
}
