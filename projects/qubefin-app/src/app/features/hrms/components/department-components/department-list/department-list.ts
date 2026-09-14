import { Component, input, output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
@Component({
  selector: 'qfin-department-list',
  imports: [CommonModule, MatTableModule, MatTooltipModule, MatButtonModule, LucideDynamicIcon],
  templateUrl: './department-list.html',
  styles: ``,
})
export class DepartmentList {
  readonly data = input<any[]>([]);
  readonly selectedId = input('');
  readonly isCollapsed = input(false);
  onViewDetail = output<string>();
  displayedColumns = ['sl', 'name', 'hodEmployeeName', 'isActive', 'action'];

  get columns() {
    return this.isCollapsed() ? ['name', 'isActive', 'action'] : this.displayedColumns;
  }

  onDetailView(id: string) {
    this.onViewDetail.emit(id);
  }
}
