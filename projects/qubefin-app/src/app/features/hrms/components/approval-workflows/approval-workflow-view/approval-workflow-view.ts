import { Component, computed, effect, inject, model, output, signal } from '@angular/core';
import { ApprovalWorkflowStore } from '../../../stores/approval-workflow-store';
import { EMPTY_UUID } from 'qubefin-core';
import { APP_ICONS_MAP } from '../../../../../lucide-icons';
import { LucideDynamicIcon } from '@lucide/angular';
import { DatePipe } from '@angular/common';
import { IApprovalWorkflowDetail } from '../../../models/approval-workflow';

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

  readonly approvalWorkflow = computed(() => this.approvalWorkflowCache());

  private readonly approvalWorkflowCache = signal<IApprovalWorkflowDetail | undefined>(undefined);

  constructor() {
    effect(() => {
      if (this.approvalWorkflowId() && this.approvalWorkflowId() !== EMPTY_UUID) {
        this.approvalWorkflowStore.setApprovalWorkflowId(this.approvalWorkflowId());
      }
    });

    effect(() => {
      const value = this.approvalWorkflowStore.approvalWorkflow;

      if (value) {
        this.approvalWorkflowCache.set(value());
      }
    });
  }

  onShowEdit() {
    this.showEdit.emit(true);
  }
}
