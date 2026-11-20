import { Component, input, output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';

@Component({
  selector: 'qfin-leave-prayer-approval-list',
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatTooltipModule,
    MatButtonModule,
    DatePipe,
    LucideDynamicIcon,
  ],
  templateUrl: './leave-prayer-approval-list.html',
  styles: ``,
})
export class LeavePrayerApprovalList {
  readonly data = input<any[]>([]);
  readonly totalRecords = input(0);
  readonly pageIndex = input(0);
  readonly pageSize = input(10);
  readonly selectedId = input('');
  readonly isCollapsed = input(false);

  pageChanged = output<PageEvent>();
  onViewDetail = output<string>();
  sortChanged = output<Sort>();

  displayedColumns = ['sl', 'employeeName', 'code', 'leaveType', 'appliedOn', 'status', 'action'];

  get columns() {
    return this.isCollapsed() ? ['nameCode', 'appliedOn', 'action'] : this.displayedColumns;
  }

  onDetailView(id: string) {
    this.onViewDetail.emit(id);
  }

  onPage(event: PageEvent) {
    this.pageChanged.emit(event);
  }

  onSortChange(sort: Sort) {
    this.sortChanged.emit(sort);
  }
}
