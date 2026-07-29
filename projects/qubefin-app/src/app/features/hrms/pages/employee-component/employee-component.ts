import { Component, effect, inject, signal } from '@angular/core';
import { EMPTY_UUID } from 'qubefin-core';
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { EmployeeComponentList } from '../../components/employees/employee-component-list/employee-component-list';
import { EmployeeComponentView } from '../../components/employees/employee-component-view/employee-component-view';
import { EmployeeComponentDetail } from '../../components/employees/employee-component-detail/employee-component-detail';
import { EmployeeStore } from '../../stores/employee-store';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'qfin-employee-component',
  imports: [
    EmployeeComponentList,CommonModule, MatFormFieldModule, MatInputModule, FormsModule, EmployeeComponentView, EmployeeComponentDetail, MatIconModule, MatButtonModule, LucideDynamicIcon,
    MatTooltipModule,
  ],
  templateUrl: './employee-component.html',
})
export class EmployeeComponent {
  public readonly EMPTY_UUID = EMPTY_UUID;
  readonly iconMap = APP_ICONS_MAP;
  // Filter properties
  showFilterArea = signal<boolean>(false);
  // Injecting the store that manages pagination and filtering states
  readonly employeeStore = inject(EmployeeStore);
  
  tempSearch = '';
  isViewMode = signal<boolean>(true);
  selectedEmployeeComponentId = signal<string>(EMPTY_UUID);
  employeeComponents = this.employeeStore.employeeListComponents;
  
  protected onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.employeeStore.setSearchQuery(input.value);
  }

  protected changePage(delta: number): void {
    const current = this.employeeStore.pageIndex();
    const next = current + delta;
    if (next >= 0) {
      this.employeeStore.setPage(next);
    }
  }

  protected onView(id: string) {
    this.selectedEmployeeComponentId.set(id);
    console.log(this.selectedEmployeeComponentId());
    this.isViewMode.set(true);
  }

  protected onEdit() {
    this.isViewMode.set(false);
  }

  protected onAdd() {
    this.isViewMode.set(false);
    this.selectedEmployeeComponentId.set(EMPTY_UUID);
  }

  protected closePanel() {
    this.selectedEmployeeComponentId.set(EMPTY_UUID);
    this.isViewMode.set(true);
  }
   // Closes panels and forces state reset safely
  protected handleCancel() {
    this.selectedEmployeeComponentId.set(EMPTY_UUID);
    this.isViewMode.set(true);
  }

  // Executed on successful API responses from employee-component-detail
  protected handleSave() {
    this.selectedEmployeeComponentId.set(EMPTY_UUID);
    this.isViewMode.set(true);
  }
  protected handleUpdate(event: any) {
    console.log(event);
  }

  protected toggleFilterArea() {
    this.showFilterArea.update(v => !v);
  }

  protected applyFilters() {
    this.employeeStore.setSearchQuery(this.tempSearch);

  }

  protected resetFilters() {
    this.applyFilters();
  }
}
