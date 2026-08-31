import {
  Component,
  computed,
  EventEmitter,
  input,
  Input,
  output,
  Output,
  signal,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IEmployeesBySearchResult } from '../../../models/employee-detail';
import { APP_ICONS_MAP } from '../../../../../lucide-icons';
import { LucideDynamicIcon } from '@lucide/angular';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';

@Component({
  selector: 'qfin-employee-component-list',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    LucideDynamicIcon,
    MatPaginatorModule,
    MatTableModule,
    MatSortModule,
  ],
  templateUrl: './employee-component-list.html',
})
export class EmployeeComponentList {
  onViewDetail = output<string>();
  data = input<IEmployeesBySearchResult[]>([]);
  isCollapsed = input<boolean>(false);
  selectedId = input<string>('');
  totalRecords = input<number>(0);
  pageIndex = input<number>(0);
  pageSize = input<number>(10);
  pageChanged = output<PageEvent>();
  sortChanged = output<Sort>();
  readonly iconMap = APP_ICONS_MAP;
  displayedColumns = computed(() => {
    if (this.isCollapsed()) {
      return ['nameCode', 'action'];
    }
    return [
      'sl',
      'company',
      'orgUnit',
      'name',
      'code',
      'gender',
      'mobile',
      'joiningDate',

      'action',
    ];
  });
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
