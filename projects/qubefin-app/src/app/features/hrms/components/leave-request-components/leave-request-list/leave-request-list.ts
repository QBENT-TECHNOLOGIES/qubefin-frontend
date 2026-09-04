import { Component, input, output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';

@Component({
  selector: 'qfin-leave-request-list',
  imports: [
    CommonModule,
    MatTableModule,
    MatTooltipModule,
    MatButtonModule,
    DatePipe,
    LucideDynamicIcon,
  ],
  templateUrl: './leave-request-list.html',
  styles: ``,
})
export class LeaveRequestList {
  readonly data = input<any[]>([]);
  readonly selectedId = input('');
  readonly isCollapsed = input(false);

  onViewDetail = output<string>();

  displayedColumns = ['sl', 'leaveType', 'fromDate', 'toDate', 'totalDays', 'status', 'action'];

  get columns() {
    return this.isCollapsed() ? ['fromDate', 'toDate', 'action'] : this.displayedColumns;
  }

  getStatusClass(status: string | null | undefined): string {
    switch (status) {
      case 'Approved':
        return 'text-emerald-600 dark:text-emerald-400';

      case 'Rejected':
        return 'text-rose-600 dark:text-rose-400';

      case 'Cancelled':
        return 'text-slate-600 dark:text-slate-400';

      case 'Lapsed':
        return 'text-slate-600 dark:text-slate-400';

      case 'Pending':
        return 'text-yellow-600 dark:text-yellow-400';

      default:
        return 'text-blue-600 dark:text-blue-400';
    }
  }
  onDetailView(id: string) {
    this.onViewDetail.emit(id);
  }
}
