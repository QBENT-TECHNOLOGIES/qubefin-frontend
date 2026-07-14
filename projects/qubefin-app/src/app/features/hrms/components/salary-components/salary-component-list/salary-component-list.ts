import { Component, EventEmitter, input, Input, output, Output, signal } from '@angular/core';
import { ISalaryModel } from '../../../models/salary';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { APP_ICONS_MAP } from '../../../../../lucide-icons';
import { LucideDynamicIcon } from '@lucide/angular';

@Component({
  selector: 'qfin-salary-component-list',
  imports: [CommonModule, MatButtonModule,
    MatIconModule,
    MatTooltipModule, LucideDynamicIcon],
  templateUrl: './salary-component-list.html',
})
export class SalaryComponentList {
  onViewDetail = output<string>();
  data = input<ISalaryModel[]>([]);
  isCollapsed = input<boolean>(false);
  selectedId = signal<string>('');
  readonly iconMap = APP_ICONS_MAP;
  onDetailView(id: string) {
    this.selectedId.set(id);
    this.onViewDetail.emit(id);
  }
}
