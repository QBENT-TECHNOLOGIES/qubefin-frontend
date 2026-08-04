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
    return this.isCollapsed() ? ['leaveType', 'action'] : this.displayedColumns;
  }

  onDetailView(id: string) {
    this.onViewDetail.emit(id);
  }
}
