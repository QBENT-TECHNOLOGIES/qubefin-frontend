import { CommonModule } from '@angular/common';
import { Component, computed, input, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { IApprovalWorkflowEventGroupItem } from '../../../models/approval-workflow-event';

interface ApprovalWorkflowTreeRow {
  key: string;
  parentKey?: string;
  label: string;
  level: number;
  isGroup: boolean;
  rangeDays?: string;
  workflowEventPath?: string;
}

@Component({
  selector: 'qfin-approval-workflow-event-list',
  imports: [CommonModule, MatTableModule, MatTooltipModule, LucideDynamicIcon],
  templateUrl: './approval-workflow-event-list.html',
})
export class ApprovalWorkflowEventList {
  readonly data = input<IApprovalWorkflowEventGroupItem[]>([]);

  protected readonly displayedColumns = ['category', 'organizationUnitType', 'leaveType', 'rangeDays', 'workflowEventPath'];
}
