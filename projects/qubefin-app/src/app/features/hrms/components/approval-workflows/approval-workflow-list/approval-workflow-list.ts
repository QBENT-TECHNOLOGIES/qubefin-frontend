import { CommonModule } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { IApprovalWorkflow } from '../../../models/approval-workflow';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';

@Component({
  selector: 'qfin-approval-workflow-list',
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatTooltipModule,
    LucideDynamicIcon,
  ],
  templateUrl: './approval-workflow-list.html',
})
export class ApprovalWorkflowList {
  isCollapsed = input<boolean>(false);
  readonly data = input<IApprovalWorkflow[]>([]);
  readonly totalRecords = input(0);
  readonly pageIndex = input(0);
  readonly pageSize = input(10);
  readonly showDetail = output<string>();

  pageChanged = output<PageEvent>();
  sortChanged = output<Sort>();

  selectedId = signal<string>('');

  displayedColumns = computed(() => {
    if (!this.isCollapsed()) {
      return [
        'category',
        'organizationUnitType',
        'leaveType',
        'salaryGrade',
        'rangeDays',
        'workflowEventPath',
        'action',
      ];
    }
    return ['category', 'action'];
  });

  onView(id: string): void {
    this.selectedId.set(id);
    this.showDetail.emit(id);
  }

  onPage(event: PageEvent) {
    this.pageChanged.emit(event);
  }

  onSortChange(sort: Sort) {
    this.sortChanged.emit(sort);
  }
}
