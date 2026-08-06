import { Component, input } from '@angular/core';
import { IAttendanceHistory } from '../../../models/attendance-history';
import { CommonModule, DatePipe } from '@angular/common';
import { LucideDynamicIcon } from '@lucide/angular';
@Component({
  selector: 'qfin-attendance-history-component-view',
  imports: [CommonModule, DatePipe, LucideDynamicIcon],
  templateUrl: './attendance-history-component-view.html',
  styles: ``,
})
export class AttendanceHistoryComponentView {
  readonly attendanceData = input<IAttendanceHistory | null>(null);
}
