import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LucideDynamicIcon } from '@lucide/angular';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';

import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { EMPLOYEE_APPROVAL_TABS, EmployeeApprovalTab } from '../../models/employee-approval';
import { EmployeeSearchByText } from '../../models/employee-search-by-text';
import { EmployeeService } from '../../services/employee-service';
import { ApprovalRegularizationStore } from '../../stores/approval-regularizations-store';
import { LeaveApprovalStore } from '../../stores/leave-approval-store';
import { LeaveFitnessStore } from '../../stores/leave-fitness-store';
import { LeavePrayerApprovalStore } from '../../stores/leave-prayer-approval-store';
import { ApprovalRegularizations } from '../approval-regularizations/approval-regularizations';
import { LeaveApprovalComponent } from '../leave-approval-component/leave-approval-component';
import { LeaveFitnessComponent } from '../leave-fitness-component/leave-fitness-component';
import { LeavePrayerApprovalComponent } from '../leave-prayer-approval-component/leave-prayer-approval-component';

@Component({
  selector: 'qfin-employee-approvals-component',
  imports: [
    CommonModule,
    MatAutocompleteModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    LucideDynamicIcon,
    ApprovalRegularizations,
    LeaveApprovalComponent,
    LeavePrayerApprovalComponent,
    LeaveFitnessComponent,
  ],
  providers: [provideNativeDateAdapter(), DatePipe],
  templateUrl: './employee-approvals-component.html',
})
export class EmployeeApprovalsComponent {
  readonly iconMap = APP_ICONS_MAP;
  readonly tabs = EMPLOYEE_APPROVAL_TABS;

  // Every queue is injected up front so each tab badge shows its pending count without
  // the tab having been opened. The stores are root scoped and load on first injection.
  private readonly regularizationStore = inject(ApprovalRegularizationStore);
  private readonly leaveStore = inject(LeaveApprovalStore);
  private readonly prayerStore = inject(LeavePrayerApprovalStore);
  private readonly fitnessStore = inject(LeaveFitnessStore);

  private readonly employeeService = inject(EmployeeService);
  private readonly datePipe = inject(DatePipe);
  private readonly dateAdapter = inject(DateAdapter<Date>);

  readonly activeTab = signal<EmployeeApprovalTab>(EMPLOYEE_APPROVAL_TABS[0].key);
  readonly showFilterArea = signal<boolean>(true);

  readonly fromDate = signal<Date | null>(null);
  readonly toDate = signal<Date | null>(null);

  readonly employeeOptions = signal<EmployeeSearchByText[]>([]);
  readonly employeeSearchText = signal('');
  readonly selectedEmployee = signal<EmployeeSearchByText | null>(null);
  private readonly employeeSearch$ = new Subject<{ searchText: string }>();

  constructor() {
    this.dateAdapter.setLocale('en-GB');

    this.employeeSearch$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((x) => this.employeeService.getEmployeesBySearchText(x)),
      )
      .subscribe((resp: any) => {
        this.employeeOptions.set(resp ?? []);
      });
  }

  readonly pendingCounts = computed<Record<EmployeeApprovalTab, number>>(() => ({
    regularization: this.regularizationStore.totalRecords(),
    leave: this.leaveStore.totalRecords(),
    prayer: this.prayerStore.totalRecords(),
    fitness: this.fitnessStore.listData().length,
  }));

  readonly totalPending = computed(() => {
    const counts = this.pendingCounts();
    return this.tabs.reduce((total, tab) => total + counts[tab.key], 0);
  });

  protected onSelectTab(tab: EmployeeApprovalTab) {
    this.activeTab.set(tab);
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

  /** Pushes the one filter into every queue, so switching tabs keeps the same view. */
  protected applyFilters() {
    const from = this.formatDate(this.fromDate());
    const to = this.formatDate(this.toDate());
    const employeeId = this.selectedEmployee()?.id ?? '';

    this.regularizationStore.setFromDate(from || null);
    this.regularizationStore.setToDate(to || null);
    this.regularizationStore.setEmployeeId(employeeId || null);

    this.leaveStore.setFromDateQuery(from);
    this.leaveStore.setToDateQuery(to);
    this.leaveStore.setSearchedEmployeeIdQuery(employeeId);

    this.prayerStore.setFromDateQuery(from);
    this.prayerStore.setToDateQuery(to);
    this.prayerStore.setSearchedEmployeeIdQuery(employeeId);

    // Fitness approvals have no server side filter, so they are narrowed by the
    // employee's name over the list already loaded.
    this.fitnessStore.setEmployeeNameQuery(this.selectedEmployee()?.employeeName ?? '');
    this.fitnessStore.setDateRange(this.fromDate(), this.toDate());
  }

  protected resetFilters() {
    this.fromDate.set(null);
    this.toDate.set(null);
    this.selectedEmployee.set(null);
    this.employeeSearchText.set('');
    this.employeeOptions.set([]);
    this.applyFilters();
  }

  private formatDate(date: Date | null): string {
    if (!date) return '';
    return this.datePipe.transform(date, 'yyyy-MM-dd') ?? '';
  }
}
