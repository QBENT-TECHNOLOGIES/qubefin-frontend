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
import { IEmployee } from '../../../models/employee-detail';
import { IEmployeeAttendanceHistory } from '../../../models/employee-attendance-history';
@Component({
  selector: 'qfin-employee-attendance-history-view',
  imports: [],
  templateUrl: './employee-attendance-history-view.html',
  styles: ``,
})
export class EmployeeAttendanceHistoryView {}
