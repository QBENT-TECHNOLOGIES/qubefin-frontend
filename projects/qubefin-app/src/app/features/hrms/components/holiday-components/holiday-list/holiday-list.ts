import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { IHolidayList } from '../../../models/holiday-detail';

@Component({
  selector: 'qfin-holiday-list',
  imports: [CommonModule, MatTableModule, MatTooltipModule, LucideDynamicIcon],
  templateUrl: './holiday-list.html',
})
export class HolidayList {
  readonly data = input<IHolidayList[]>([]);
  readonly selectedId = input('');
  readonly isCollapsed = input(false);

  onViewDetail = output<string>();

  displayedColumns = ['sl', 'holidayDate', 'description', 'action'];

  get columns() {
    return this.isCollapsed() ? ['holidayDate', 'action'] : this.displayedColumns;
  }

  onDetailView(id: string) {
    this.onViewDetail.emit(id);
  }
}
