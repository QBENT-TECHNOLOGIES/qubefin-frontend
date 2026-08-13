import { Component, effect, inject, signal } from '@angular/core';
import { EMPTY_UUID } from 'qubefin-core';
import { MatIconModule } from '@angular/material/icon';
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
import { CommonModule, DatePipe } from '@angular/common';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';

@Component({
  selector: 'qfin-employee-component',
  imports: [
    EmployeeComponentList,
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    EmployeeComponentView,
    EmployeeComponentDetail,
    MatIconModule,
    MatButtonModule,
    LucideDynamicIcon,
    MatTooltipModule,
    MatDatepickerModule,
  ],
  providers: [provideNativeDateAdapter(), DatePipe],
  templateUrl: './employee-component.html',
})
export class EmployeeComponent {
  public readonly EMPTY_UUID = EMPTY_UUID;
  private readonly datePipe = inject(DatePipe);
  private readonly dateAdapter = inject(DateAdapter<Date>);
  readonly srchJoiningDate = signal<Date | null>(null);
  readonly iconMap = APP_ICONS_MAP;
  // Filter properties
  showFilterArea = signal<boolean>(false);
  // Injecting the store that manages pagination and filtering states
  readonly employeeStore = inject(EmployeeStore);
  constructor() {
    this.dateAdapter.setLocale('en-GB');
  }
  tempSearch = '';
  isViewMode = signal<boolean>(true);
  selectedEmployeeComponentId = signal<string>(EMPTY_UUID);
  employeeComponents = this.employeeStore.employeeListComponents;

  protected onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.employeeStore.setSearchQuery(input.value);
  }

  pageChanged(event: PageEvent) {
    this.employeeStore.setPage(event.pageIndex);
    this.employeeStore.setPageSize(event.pageSize);
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
    this.showFilterArea.update((v) => !v);
  }

  protected applyFilters() {
    this.employeeStore.setSearchQuery(this.tempSearch);
    const date = this.srchJoiningDate();
    const formattedDate = date ? this.datePipe.transform(date, 'yyyy-MM-dd') : null;
    this.employeeStore.setSearchJoiningDate(formattedDate);
  }

  protected resetFilters() {
    this.tempSearch = '';
    this.srchJoiningDate.set(null);
    this.employeeStore.setSearchQuery('');
    this.employeeStore.setSearchJoiningDate(null);
    this.applyFilters();
  }
  onSortChanged(sort: Sort) {
    if (!sort.direction) {
      return;
    }

    this.employeeStore.setSort(sort.active, sort.direction as 'asc' | 'desc');
  }
}
