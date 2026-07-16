import { Component, computed, EventEmitter, input, Input, output, Output, signal } from '@angular/core';

import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IEmployeesBySearchResult } from '../../../models/employee-detail';
import { APP_ICONS_MAP } from '../../../../../lucide-icons';
import { LucideDynamicIcon } from '@lucide/angular';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'qfin-employee-component-list',
  imports: [CommonModule, MatButtonModule,
    MatIconModule,
    MatTooltipModule, LucideDynamicIcon,
    MatTableModule],
  templateUrl: './employee-component-list.html',
})
export class EmployeeComponentList {
  onViewDetail = output<string>();
  data = input<IEmployeesBySearchResult[]>([]);
  isCollapsed = input<boolean>(false);
  selectedId = input<string>('');
  readonly iconMap = APP_ICONS_MAP;
  displayedColumns = computed(() => {
    if (this.isCollapsed()) {
      return ['nameCode', 'action'];
    }
    return ['name', 'code', 'joiningDate', 'action'];
  });
  onDetailView(id: string) {
    this.onViewDetail.emit(id);
  }

}
