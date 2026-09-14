import { Component, computed, inject, signal } from '@angular/core';
import { EMPTY_UUID } from 'qubefin-core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { CommonModule } from '@angular/common';
import { DepartmentList } from '../../components/department-components/department-list/department-list';
import { DepartmentDetail } from '../../components/department-components/department-detail/department-detail';
import { DepartmentView } from '../../components/department-components/department-view/department-view';
import { DepartmentStore } from '../../stores/department-store';
@Component({
  selector: 'qfin-department-component',
  imports: [
    MatIconModule,
    MatTooltipModule,
    LucideDynamicIcon,
    CommonModule,
    DepartmentList,
    DepartmentView,
    DepartmentDetail,
  ],
  templateUrl: './department-component.html',
  styles: ``,
})
export class DepartmentComponent {
  public readonly EMPTY_UUID = EMPTY_UUID;
  readonly departmentStore = inject(DepartmentStore);

  readonly isViewMode = signal<boolean>(true);
  readonly selectedDepartmentId = signal<string>(EMPTY_UUID);
  readonly departments = this.departmentStore.departments;
  readonly hasSelectedDepartment = computed(
    () => this.selectedDepartmentId() !== EMPTY_UUID || !this.isViewMode(),
  );
  protected onView(id: string) {
    this.selectedDepartmentId.set(id);
    this.isViewMode.set(true);
  }
  protected onEdit() {
    this.isViewMode.set(false);
  }
  protected onAdd() {
    this.isViewMode.set(false);
    this.selectedDepartmentId.set(EMPTY_UUID);
  }
  protected closePanel() {
    this.selectedDepartmentId.set(EMPTY_UUID);
    this.isViewMode.set(true);
  }
}
