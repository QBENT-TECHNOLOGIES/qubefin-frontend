import { Component, signal } from '@angular/core';
import { FormField, form, required, schema, Schema } from '@angular/forms/signals';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideDynamicIcon } from '@lucide/angular';
import { IApprovalWorkflowEvent } from '../../models/approval-workflow-event';

type ApprovalWorkflowEventFormModel = Omit<
  IApprovalWorkflowEvent,
  'leaveTypeId' | 'organizationUnitTypeId' | 'salaryGradeId' | 'postId'
> & {
  leaveTypeId: string;
  organizationUnitTypeId: string;
  salaryGradeId: string;
  postId: string;
};

@Component({
  selector: 'qfin-approval-workflow-event',
  imports: [
    FormField,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    LucideDynamicIcon,
  ],
  templateUrl: './approval-workflow-event.html',
})
export class ApprovalWorkflowEvent {
  protected readonly categories = ['Leave', 'Organization Unit', 'Salary Grade', 'Post'];
  protected readonly eventStatuses = ['Pending', 'Recommended', 'Approved', 'Rejected'];

  protected readonly workflowEventModel = signal<ApprovalWorkflowEventFormModel>({
    id: '',
    category: 'Leave',
    leaveTypeId: '',
    organizationUnitTypeId: '',
    salaryGradeId: '',
    postId: '',
    minimumDays: 0,
    maximumDays: null,
    sequenceNo: 1,
    receiverPostId: '',
    isRecommendEvent: false,
    isApprovalEvent: true,
    eventStatus: 'Pending',
    eventButtonText: 'Approve',
  });

  protected readonly workflowEventSchema: Schema<ApprovalWorkflowEventFormModel> = schema(path => {
    required(path.category, { message: 'Category is required' });
    required(path.receiverPostId, { message: 'Receiver post is required' });
    required(path.eventStatus, { message: 'Event status is required' });
    required(path.eventButtonText, { message: 'Button text is required' });
  });

  protected readonly workflowEventForm = form(this.workflowEventModel, this.workflowEventSchema);

  protected save(): void {
    if (!this.workflowEventForm().valid()) {
      return;
    }

    const value = this.workflowEventForm().value();
    const workflowEvent: IApprovalWorkflowEvent = {
      ...value,
      leaveTypeId: value.leaveTypeId || null,
      organizationUnitTypeId: value.organizationUnitTypeId || null,
      salaryGradeId: value.salaryGradeId || null,
      postId: value.postId || null,
    };
    console.log('Approval workflow event', workflowEvent);
  }
}
