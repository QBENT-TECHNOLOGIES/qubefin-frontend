import { Component, effect, inject, model, output } from '@angular/core';
import { ApprovalWorkflowStore } from '../../../stores/approval-workflow-store';
import { EMPTY_UUID } from 'qubefin-core';
import { APP_ICONS_MAP } from '../../../../../lucide-icons';
import { LucideDynamicIcon } from '@lucide/angular';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'qfin-approval-workflow-view',
  imports: [DatePipe, LucideDynamicIcon],
  templateUrl: './approval-workflow-view.html',
})
export class ApprovalWorkflowView {
  approvalWorkflowStore = inject(ApprovalWorkflowStore);

  approvalWorkflowId = model<string>(EMPTY_UUID);

  showEdit = output<boolean>();

  readonly iconMap = APP_ICONS_MAP;
  readonly approvalWorkflow = this.approvalWorkflowStore.approvalWorkflow;
  readonly loading = this.approvalWorkflowStore.approvalWorkflowLoading;

  constructor() {
    effect(() => {
      if (this.approvalWorkflowId() && this.approvalWorkflowId() !== EMPTY_UUID) {
        this.approvalWorkflowStore.setApprovalWorkflowId(this.approvalWorkflowId());
      }
    });
  }

  onShowEdit() {
    this.showEdit.emit(true);
  }
}
