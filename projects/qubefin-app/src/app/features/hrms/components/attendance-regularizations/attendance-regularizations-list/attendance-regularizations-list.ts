import { Component, computed, inject, input, output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { IAttendanceRegularization } from '../../../models/attendance-regularization';
@Component({
  selector: 'qfin-attendance-regularizations-list',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    LucideDynamicIcon,
    MatTableModule,
    MatPaginatorModule,
  ],
  providers: [DatePipe],
  templateUrl: './attendance-regularizations-list.html',
  styles: ``,
})
export class AttendanceRegularizationsList {
  isCollapsed = input<boolean>(false);
  data = input<IAttendanceRegularization[]>([]);
  pageChanged = output<PageEvent>();
  private readonly datePipe = inject(DatePipe);
  readonly totalRecords = input(0);
  readonly pageIndex = input(0);
  readonly pageSize = input(10);
  displayedColumns = computed(() => {
    if (this.isCollapsed()) {
      return ['regularizationType', 'regularizationDate', 'action'];
    }
    return ['sl', 'regularizationType', 'regularizationDate', 'reason', 'status', 'action'];
  });
  onViewDetail = output<string>();
  onPage(event: PageEvent) {
    this.pageChanged.emit(event);
  }

  dateFormatter(date: any) {
    const datesArray = date.split(',').map((d: any) => this.datePipe.transform(d, 'dd/MM/yyyy'));
    if (datesArray.length === 1) {
      return datesArray[0];
    }
    return datesArray.join(', ');
  }
}
