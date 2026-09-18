import {
  Component,
  computed,
  EventEmitter,
  inject,
  input,
  Input,
  output,
  Output,
  signal,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IEmployeesBySearchResult } from '../../../models/employee-detail';
import { APP_ICONS_MAP } from '../../../../../lucide-icons';
import { LucideDynamicIcon } from '@lucide/angular';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { GrossSalaryModal } from '../gross-salary-modal/gross-salary-modal';
import { MatDialog } from '@angular/material/dialog';
import { AttendanceCalendarModal } from '../../attendance-history-components/attendance-calendar-modal/attendance-calendar-modal';
@Component({
  selector: 'qfin-employee-component-list',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    LucideDynamicIcon,
    MatPaginatorModule,
    MatTableModule,
    MatSortModule,
  ],
  templateUrl: './employee-component-list.html',
})
export class EmployeeComponentList {
  private readonly dialog = inject(MatDialog);
  onViewDetail = output<string>();
  data = input<IEmployeesBySearchResult[]>([]);
  isCollapsed = input<boolean>(false);
  selectedId = input<string>('');
  totalRecords = input<number>(0);
  pageIndex = input<number>(0);
  pageSize = input<number>(10);
  pageChanged = output<PageEvent>();
  sortChanged = output<Sort>();
  readonly iconMap = APP_ICONS_MAP;
  displayedColumns = computed(() => {
    if (this.isCollapsed()) {
      return ['nameCode', 'action'];
    }
    return [
      'sl',
      'company',
      'orgUnit',
      'name',
      'code',
      'gender',
      'mobile',
      'joiningDate',

      'action',
    ];
  });
  onDetailView(id: string) {
    this.onViewDetail.emit(id);
  }
  onPage(event: PageEvent) {
    this.pageChanged.emit(event);
  }
  onSortChange(sort: Sort) {
    this.sortChanged.emit(sort);
  }
  openGradeModal(id: string) {
    this.dialog.open(GrossSalaryModal, {
      data: { id: id },
      maxWidth: '95vw',
      panelClass: 'glass-modal',
    });
  }

  openCalendarModal(employee: IEmployeesBySearchResult) {
    this.dialog.open(AttendanceCalendarModal, {
      data: {
        employeeId: employee.id,
        employeeName: employee.fullName,
      },
      width: '500px',
      maxWidth: '105vw',
      disableClose: true,
      panelClass: 'glass-modal',
    });
  }
}
