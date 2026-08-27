import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { LucideDynamicIcon } from '@lucide/angular';
import { EmployeeWiseCalculationResponse } from '../../../models/employee-lop-finalization';
import { MatSortModule, Sort } from '@angular/material/sort';

@Component({
  selector: 'qfin-employee-lop-finalization-list',
  imports: [
    CommonModule,
    MatTableModule,
    MatTooltipModule,
    MatButtonModule,
    MatPaginatorModule,
    LucideDynamicIcon,
    MatSortModule,
  ],
  templateUrl: './employee-lop-finalization-list.html',
  styles: ``,
})
export class EmployeeLopFinalizationList {
  readonly data = input<EmployeeWiseCalculationResponse[]>([]);
  readonly selectedId = input('');
  readonly isCollapsed = input(false);

  readonly totalRecords = input(0);
  readonly pageIndex = input(0);
  readonly pageSize = input(10);

  onEditDetail = output<string>();
  pageChanged = output<PageEvent>();
  sortChanged = output<Sort>();

  displayedColumns = [
    'sl',
    'companyName',
    'organizationUnitName',
    'employeeName',
    'employeeCode',
    'workingDays',
    'leaveDays',
    'holiDays',
    'attendanceDays',
    'absentDays',
    'attendanceIrregularDays',
    'irregularLopDays',
    'action',
  ];

  get columns() {
    return this.isCollapsed() ? ['employeeName', 'employeeCode', 'action'] : this.displayedColumns;
  }

  onEditAction(id: string) {
    this.onEditDetail.emit(id);
  }

  onPage(event: PageEvent) {
    this.pageChanged.emit(event);
  }

  onSortChange(sort: Sort) {
    this.sortChanged.emit(sort);
  }
}
