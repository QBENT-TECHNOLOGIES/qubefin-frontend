import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideDynamicIcon } from '@lucide/angular';
import { IEmployeeAttendanceHistory } from '../../../models/employee-attendance-history';
@Component({
  selector: 'qfin-employee-attendance-history-view',
  imports: [CommonModule, LucideDynamicIcon],
  templateUrl: './employee-attendance-history-view.html',
  styles: ``,
})
export class EmployeeAttendanceHistoryView {
  readonly attendanceData = input<IEmployeeAttendanceHistory | null>(null);
}
