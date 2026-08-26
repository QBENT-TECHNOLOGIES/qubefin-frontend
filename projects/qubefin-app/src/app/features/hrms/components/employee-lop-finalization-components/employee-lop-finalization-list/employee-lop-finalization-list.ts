import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { EmployeeWiseCalculationResponse } from '../../../models/employee-lop-finalization';

@Component({
  selector: 'qfin-employee-lop-finalization-list',
  imports: [
    CommonModule,
    MatTableModule,
    MatTooltipModule,
    MatButtonModule,
    LucideDynamicIcon,
  ],
  templateUrl: './employee-lop-finalization-list.html',
  styles: ``,
})
export class EmployeeLopFinalizationList {
  readonly data = input<EmployeeWiseCalculationResponse[]>([]);
  readonly selectedId = input('');
  readonly isCollapsed = input(false);

  onEditDetail = output<string>();

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
    'action'
  ];

  get columns() {
    return this.isCollapsed() ? ['employeeName', 'employeeCode', 'action'] : this.displayedColumns;
  }

  onEditAction(id: string) {
    this.onEditDetail.emit(id);
  }
}
