import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { ILeaveFitnessListItem } from '../../../models/leave-fitness';

@Component({
  selector: 'qfin-leave-fitness-list',
  imports: [CommonModule, MatTableModule, MatTooltipModule, MatButtonModule, LucideDynamicIcon],
  templateUrl: './leave-fitness-list.html',
  styles: ``,
})
export class LeaveFitnessList {
  readonly data = input<ILeaveFitnessListItem[]>([]);
  readonly selectedId = input('');
  readonly isCollapsed = input(false);

  onViewDetail = output<string>();

  displayedColumns = [
    'sl',
    'employeeName',
    'leaveType',
    'fromDate',
    'toDate',
    'totalDays',
    'action',
  ];

  get columns() {
    return this.isCollapsed() ? ['employeeName', 'action'] : this.displayedColumns;
  }

  onDetailView(id: string) {
    this.onViewDetail.emit(id);
  }
}
