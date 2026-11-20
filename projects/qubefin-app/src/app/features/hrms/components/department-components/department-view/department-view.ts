import { Component, effect, inject, model, output } from '@angular/core';
import { DepartmentStore } from '../../../stores/department-store';
import { EMPTY_UUID } from 'qubefin-core';
import { DatePipe } from '@angular/common';
import { LucideDynamicIcon } from '@lucide/angular';
@Component({
  selector: 'qfin-department-view',
  imports: [DatePipe, LucideDynamicIcon],
  templateUrl: './department-view.html',
  styles: ``,
})
export class DepartmentView {
  readonly departmentStore = inject(DepartmentStore);
  readonly departmentId = model<string>(EMPTY_UUID);
  readonly showEdit = output<void>();
  readonly department = this.departmentStore.department;
  readonly loading = this.departmentStore.departmentLoading;
  readonly error = this.departmentStore.departmentError;
  constructor() {
    effect(() => {
      this.departmentStore.setDepartmentId(this.departmentId());
    });
  }

  onEdit() {
    this.showEdit.emit();
  }
}
