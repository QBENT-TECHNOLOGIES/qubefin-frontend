import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';

import { IEmployeeRecordRow, IEmployeeRecordTabConfig } from '../../../models/employee-record';

@Component({
  selector: 'qfin-employee-records-list',
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatTooltipModule,
    MatButtonModule,
    LucideDynamicIcon,
  ],
  templateUrl: './employee-records-list.html',
  styles: ``,
})
export class EmployeeRecordsList {
  readonly data = input<IEmployeeRecordRow[]>([]);
  readonly tabConfig = input.required<IEmployeeRecordTabConfig>();
  readonly totalRecords = input(0);
  readonly pageIndex = input(0);
  readonly pageSize = input(10);
  readonly selectedId = input('');
  readonly isCollapsed = input(false);

  pageChanged = output<PageEvent>();
  onViewDetail = output<string>();
  sortChanged = output<Sort>();

  readonly columns = computed(() => {
    if (this.isCollapsed()) return ['employeeCompact', 'action'];

    const headers = this.tabConfig().headers;

    return [
      'sl',
      'employee',
      'organizationUnit',
      ...(headers.category ? ['category'] : []),
      'period',
      'quantity',
      'appliedOn',
      'status',
      ...(headers.stage ? ['stage'] : []),
      'action',
    ];
  });

  // Attendance uses this column for worked hours; every other type shows the applied-on date.
  protected secondaryValue(row: IEmployeeRecordRow): string | null {
    return row.recordType === 'attendance' ? row.workingHours : row.appliedOn;
  }

  protected onDetailView(id: string) {
    this.onViewDetail.emit(id);
  }

  protected onPage(event: PageEvent) {
    this.pageChanged.emit(event);
  }

  protected onSortChange(sort: Sort) {
    this.sortChanged.emit(sort);
  }

  protected getStatusBadgeClass(status: string | null | undefined): string {
    switch (status) {
      case 'Approved':
      case 'On Time':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';

      case 'Rejected':
      case 'MSP':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400';

      case 'Cancelled':
      case 'Lapsed':
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400';

      case 'Pending':
        return 'bg-yellow-500/12 text-yellow-600 dark:text-yellow-400';

      case 'Late Entry':
      case 'Early Exit':
      case 'Late Entry & Early Exit':
        return 'bg-amber-500/12 text-amber-700 dark:text-amber-400';

      default:
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
    }
  }

  protected getStatusDotClass(status: string | null | undefined): string {
    switch (status) {
      case 'Approved':
      case 'On Time':
        return 'bg-emerald-500';

      case 'Rejected':
      case 'MSP':
        return 'bg-rose-500';

      case 'Cancelled':
      case 'Lapsed':
        return 'bg-slate-500';

      case 'Pending':
        return 'bg-yellow-500';

      case 'Late Entry':
      case 'Early Exit':
      case 'Late Entry & Early Exit':
        return 'bg-amber-500';

      default:
        return 'bg-blue-500';
    }
  }
}
