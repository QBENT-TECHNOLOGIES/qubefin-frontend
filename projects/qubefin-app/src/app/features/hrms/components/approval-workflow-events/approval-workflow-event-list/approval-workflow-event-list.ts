import { CommonModule } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';

export interface ApprovalWorkflowEventListItem {
  id: string;
  orgUnitId: string;
  holidayDate: string;
  description: string;
}

@Component({
  selector: 'qfin-approval-workflow-event-list',
  imports: [CommonModule, MatButtonModule, MatTableModule, MatTooltipModule, LucideDynamicIcon],
  templateUrl: './approval-workflow-event-list.html',
})
export class ApprovalWorkflowEventList {
  readonly data = input<ApprovalWorkflowEventListItem[]>([]);
  readonly isCollapsed = input(false);
  readonly onViewDetail = output<string>();
  protected readonly selectedId = signal('');

  protected readonly displayedColumns = computed(() =>
    this.isCollapsed()
      ? ['eventName', 'action']
      : ['eventName', 'eventCode', 'approvalLevels', 'status', 'action'],
  );

  protected viewDetail(id: string): void {
    this.selectedId.set(id);
    this.onViewDetail.emit(id);
  }
}
