import { CommonModule } from '@angular/common';
import { Component, computed, input, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { IApprovalWorkflow } from '../../../models/approval-workflow';

@Component({
  selector: 'qfin-approval-workflow-list',
  imports: [CommonModule, MatTableModule, MatTooltipModule, LucideDynamicIcon],
  templateUrl: './approval-workflow-list.html',
})
export class ApprovalWorkflowList {
  isCollapsed = input<boolean>(false);
  readonly data = input<IApprovalWorkflow[]>([]);

  protected readonly displayedColumns = ['category', 'organizationUnitType', 'leaveType', 'salaryGrade', 'rangeDays', 'workflowEventPath', 'action'];

  onView(id: string): void {
  }
}
