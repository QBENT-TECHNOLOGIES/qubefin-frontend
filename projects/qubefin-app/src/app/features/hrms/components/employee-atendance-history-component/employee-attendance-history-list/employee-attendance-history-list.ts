import { Component, computed, input, output } from '@angular/core';
import { APP_ICONS_MAP } from '../../../../../lucide-icons';
import { IAttendanceHistory } from '../../../models/attendance-history';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { IEmployeeAttendanceHistory } from '../../../models/employee-attendance-history';
@Component({
  selector: 'qfin-employee-attendance-history-list',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    LucideDynamicIcon,
    MatTableModule,
    MatPaginatorModule,
  ],
  templateUrl: './employee-attendance-history-list.html',
  styles: ``,
})
export class EmployeeAttendanceHistoryList {
  isCollapsed = input<boolean>(false);
  selectedRow = input<IAttendanceHistory | null>(null);
  data = input<IAttendanceHistory[]>([]);
  pageChanged = output<PageEvent>();
  readonly totalRecords = input(0);
  readonly pageIndex = input(0);
  readonly pageSize = input(10);
  readonly iconMap = APP_ICONS_MAP;
  displayedColumns = computed(() => {
    if (this.isCollapsed()) {
      return ['attendanceDate', 'status', 'action'];
    }
    return [
      'sl',
      'name',
      'codeName',
      'code',
      'attendanceDate',
      'actualInTime',
      'actualOutTime',
      'workingHours',
      'status',
      'action',
    ];
  });
  onViewDetail = output<string>();

  onPage(event: PageEvent) {
    this.pageChanged.emit(event);
  }
  // onDetailView(item: IEmployeeAttendanceHistory) {
  // this.onViewDetail.emit(item);
  // }
}
