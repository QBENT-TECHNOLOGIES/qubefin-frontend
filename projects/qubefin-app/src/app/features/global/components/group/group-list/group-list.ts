import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { StatusBadgeComponentComponent } from 'qubefin-core';
import { IGroupListItem } from '../../../models/group';

@Component({
  selector: 'qfin-group-list',
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatTooltipModule,
    LucideDynamicIcon,
    StatusBadgeComponentComponent,
  ],
  templateUrl: './group-list.html',
})
export class GroupList {
  readonly data = input<IGroupListItem[]>([]);
  readonly totalRecords = input(0);
  readonly pageIndex = input(0);
  readonly pageSize = input(10);
  readonly selectedId = input('');
  readonly isCollapsed = input(false);

  pageChanged = output<PageEvent>();
  onViewDetail = output<string>();
  sortChanged = output<Sort>();

  displayedColumns = ['sl', 'code', 'name', 'branchName', 'creditOfficerName', 'collection', 'formationDate', 'status', 'action'];

  get columns() {
    return this.isCollapsed() ? ['name', 'action'] : this.displayedColumns;
  }
}
