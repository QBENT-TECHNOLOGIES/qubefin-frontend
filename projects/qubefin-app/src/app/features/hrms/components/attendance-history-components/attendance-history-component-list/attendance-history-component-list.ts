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
@Component({
  selector: 'qfin-attendance-history-component-list',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    LucideDynamicIcon,
    MatTableModule,
    MatPaginatorModule,
  ],
  templateUrl: './attendance-history-component-list.html',
  styles: ``,
})
export class AttendanceHistoryComponentList {
  // isCollapsed = input<boolean>(false);
  data = input<IAttendanceHistory[]>([]);
  pageChanged = output<PageEvent>();
  readonly totalRecords = input(0);
  readonly pageIndex = input(0);
  readonly pageSize = input(10);
  readonly iconMap = APP_ICONS_MAP;
  displayedColumns = computed(() => {
    return [
      'sl',
      'attendanceDate',
      'actualInTime',
      'actualOutTime',
      'workingHours',
      'status',
      'action',
    ];
  });

  onPage(event: PageEvent) {
    this.pageChanged.emit(event);
  }
}
