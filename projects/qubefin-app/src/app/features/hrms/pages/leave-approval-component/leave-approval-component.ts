import { EMPTY_UUID } from 'qubefin-core';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { CommonModule } from '@angular/common';
import { form, FormField } from '@angular/forms/signals';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';

import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { LeaveApprovalStore } from '../../stores/leave-approval-store';
import { LeaveApprovalList } from '../../components/leave-approval-components/leave-approval-list/leave-approval-list';
import { LeaveApprovalView } from '../../components/leave-approval-components/leave-approval-view/leave-approval-view';
import { LeaveApprovalDetail } from '../../components/leave-approval-components/leave-approval-detail/leave-approval-detail';
import { EmployeeService } from '../../services/employee-service';
import { EmployeeSearchByText, EmployeeSearchResponse } from '../../models/employee-search-by-text';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'qfin-leave-approval-component',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatIconModule,
    MatTooltipModule,
    LucideDynamicIcon,
    CommonModule,
    LeaveApprovalList,
    LeaveApprovalView,
    LeaveApprovalDetail,
    MatAutocompleteModule,
    MatDatepickerModule,
  ],
  providers: [provideNativeDateAdapter(), DatePipe],
  templateUrl: './leave-approval-component.html',
  styles: ``,
})
export class LeaveApprovalComponent {
  public readonly EMPTY_UUID = EMPTY_UUID;
  readonly iconMap = APP_ICONS_MAP;

  readonly leaveApprovalStore = inject(LeaveApprovalStore);
  private readonly employeeService = inject(EmployeeService);
  private readonly datePipe = inject(DatePipe);
  private readonly dateAdapter = inject(DateAdapter<Date>);

  readonly isViewMode = signal<boolean>(true);
  readonly showFilterArea = signal<boolean>(false);
  readonly selectedLeaveApprovalId = signal<string>(EMPTY_UUID);

  readonly fromDate = signal<Date | null>(null);
  readonly toDate = signal<Date | null>(null);

  readonly employeeOptions = signal<EmployeeSearchByText[]>([]);
  readonly employeeSearchText = signal('');
  private readonly employeeSearch$ = new Subject<{ searchText: string }>();
  readonly selectedEmployee = signal<EmployeeSearchByText | null>(null);

  constructor() {
    this.dateAdapter.setLocale('en-GB');

    this.employeeSearch$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((x) => this.employeeService.getEmployeesBySearchText(x)),
      )
      .subscribe((response: EmployeeSearchResponse) => {
        this.employeeOptions.set(
          response.value?.employees ??
            response.valueOrDefault?.employees ??
            response.employees ??
            [],
        );
      });
  }

  readonly leaveApprovals = this.leaveApprovalStore.leaveApprovals;
  readonly hasSelectedLeaveApproval = computed(
    () => this.selectedLeaveApprovalId() !== EMPTY_UUID || !this.isViewMode(),
  );

  protected onView(id: string) {
    this.selectedLeaveApprovalId.set(id);
    this.isViewMode.set(true);
  }

  protected onActionMode() {
    this.isViewMode.set(false);
  }

  protected closePanel() {
    this.selectedLeaveApprovalId.set(EMPTY_UUID);
    this.isViewMode.set(true);
  }

  protected toggleFilterArea() {
    this.showFilterArea.update((v) => !v);
  }

  protected searchEmployees(searchText: string) {
    this.employeeSearchText.set(searchText);

    if (!searchText.trim()) {
      this.employeeOptions.set([]);
      this.employeeSearchText.set('');
      this.selectedEmployee.set(null);
      return;
    }

    this.employeeSearch$.next({ searchText });
  }

  protected selectEmployee(event: MatAutocompleteSelectedEvent) {
    const employee = event.option.value as EmployeeSearchByText;
    this.selectedEmployee.set(employee);
    this.employeeSearchText.set(employee.employeeName);
  }

  displayEmployeeName(employee: EmployeeSearchByText | string | null): string {
    if (!employee) return '';
    return typeof employee === 'string' ? employee : employee.employeeName;
  }

  protected applyFilters() {
    const from = this.fromDate();
    const to = this.toDate();

    this.leaveApprovalStore.setFromDateQuery(
      from ? this.datePipe.transform(from, 'yyyy-MM-dd') || '' : '',
    );
    this.leaveApprovalStore.setToDateQuery(
      to ? this.datePipe.transform(to, 'yyyy-MM-dd') || '' : '',
    );
    this.leaveApprovalStore.setSearchedEmployeeIdQuery(this.selectedEmployee()?.id || '');
  }

  protected resetFilters() {
    this.fromDate.set(null);
    this.toDate.set(null);
    this.selectedEmployee.set(null);
    this.employeeSearchText.set('');
    this.employeeOptions.set([]);
    this.applyFilters();
  }

  protected changePage(delta: number) {
    const current = this.leaveApprovalStore.pageIndex();
    const next = current + delta;
    if (next >= 0) {
      this.leaveApprovalStore.setPage(next);
    }
  }

  pageChanged(event: PageEvent) {
    this.leaveApprovalStore.setPage(event.pageIndex);
    this.leaveApprovalStore.setPageSize(event.pageSize);
  }

  onSortChanged(sort: Sort) {
    if (!sort.direction) {
      return;
    }
    this.leaveApprovalStore.setSort(sort.active, sort.direction as 'asc' | 'desc');
  }

  protected onActionCompleted() {
    this.closePanel();
  }
}
