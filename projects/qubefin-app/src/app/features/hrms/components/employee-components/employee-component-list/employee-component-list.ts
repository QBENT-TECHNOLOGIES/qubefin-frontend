import { Component, EventEmitter, input, Input, output, Output, signal } from '@angular/core';

import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IEmployeesBySearchResult } from '../../../models/employee-detail';

@Component({
  selector: 'qfin-employee-component-list',
  imports: [CommonModule, MatButtonModule,
    MatIconModule,
    MatTooltipModule],
  templateUrl: './employee-component-list.html',
})
export class EmployeeComponentList {
  onViewDetail = output<string>();
  data = input<IEmployeesBySearchResult[]>([]);
  isCollapsed = input<boolean>(false);
  selectedId = input<string>(''); 
  onDetailView(id: string) {
    this.onViewDetail.emit(id);
  }
  
}
