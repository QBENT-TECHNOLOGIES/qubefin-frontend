import { Component, input, output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';

@Component({
  selector: 'qfin-survey-committee-unit-list',
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatTooltipModule,
    MatButtonModule,
    DatePipe,
    LucideDynamicIcon,
  ],
  templateUrl: './survey-committee-unit-list.html',
  styles: ``,
})
export class SurveyCommitteeUnitList {
  // Input From Parant
  readonly data = input<any[]>([]);
  readonly totalRecords = input(0);
  readonly pageIndex = input(0);
  readonly pageSize = input(10);
  readonly selectedId = input('');
  readonly isCollapsed = input(false);

  // Emit From Child
  pageChanged = output<PageEvent>();
  onViewDetail = output<string>();
  sortChanged = output<Sort>();

  displayedColumns = ['sl', 'employee', 'lead', 'status', 'assignedFrom', 'assignedTo', 'action'];

  get columns() {
    return this.isCollapsed() ? ['employee', 'action'] : this.displayedColumns;
  }

  onDetailView(id: string) {
    this.onViewDetail.emit(id);
  }

  onPage(event: PageEvent) {
    this.pageChanged.emit(event);
  }

  onSortChange(sort: Sort) {
    this.sortChanged.emit(sort);
  }
}
