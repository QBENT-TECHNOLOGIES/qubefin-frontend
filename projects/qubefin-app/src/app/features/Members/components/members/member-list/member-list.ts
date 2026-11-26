import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { APP_ICONS_MAP } from '../../../../../lucide-icons';
import { IMembersBySearchResult } from '../../../models/member-detail';

@Component({
  selector: 'qfin-member-list',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatMenuModule,
    LucideDynamicIcon,
    MatPaginatorModule,
    MatTableModule,
    MatSortModule,
  ],
  templateUrl: './member-list.html',
  styles: ``,
})
export class MemberList {
  onEditDetail = output<string>();
  pageChanged = output<PageEvent>();
  sortChanged = output<Sort>();
  onViewDetail = output<string>();

  data = input<IMembersBySearchResult[]>([]);
  isCollapsed = input<boolean>(false);
  selectedId = input<string>('');
  totalRecords = input<number>(0);
  pageIndex = input<number>(0);
  pageSize = input<number>(10);

  readonly iconMap = APP_ICONS_MAP;

  displayedColumns = computed(() => {
    if (this.isCollapsed()) {
      return ['nameCode', 'action'];
    }
    return [
      'sl',
      'branchCode',
      'code',
      'name',
      'guardianName',
      'dateOfBirth',
      'gender',
      'mobileNo',
      'action',
    ];
  });

  onEdit(id: string) {
    this.onEditDetail.emit(id);
  }

  onPage(event: PageEvent) {
    this.pageChanged.emit(event);
  }

  onSortChange(sort: Sort) {
    this.sortChanged.emit(sort);
  }

  onDetailView(id: string) {
    this.onViewDetail.emit(id);
  }
}
