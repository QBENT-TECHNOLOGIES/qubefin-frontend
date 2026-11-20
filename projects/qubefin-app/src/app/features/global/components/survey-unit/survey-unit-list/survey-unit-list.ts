import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { APP_ICONS_MAP } from '../../../../../lucide-icons';
@Component({
  selector: 'qfin-survey-unit-list',
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatTooltipModule,
    MatButtonModule,
    LucideDynamicIcon,
  ],
  templateUrl: './survey-unit-list.html',
  styles: ``,
})
export class SurveyUnitList {
  // Input From Parant
  readonly data = input<any[]>([]);
  readonly totalRecords = input(0);
  readonly pageIndex = input(0);
  readonly pageSize = input(10);
  readonly selectedId = input('');
  readonly isCollapsed = input(false);
  readonly iconMap = APP_ICONS_MAP;

  // Emit From Child
  pageChanged = output<PageEvent>();
  onViewDetail = output<string>();
  sortChanged = output<Sort>();

  displayedColumns = ['sl', 'assignmentNo', 'assignmentDate', 'surveyType', 'status', 'action'];

  get columns() {
    return this.isCollapsed() ? ['assignmentNo', 'action'] : this.displayedColumns;
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
