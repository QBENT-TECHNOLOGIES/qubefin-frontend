import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { Sort } from '@angular/material/sort';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import { EMPTY_UUID } from 'qubefin-core';

import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { CompanyStore } from '../../../global/stores/company-store';
import { EmployeeRecordsDetail } from '../../components/employee-records-components/employee-records-detail/employee-records-detail';
import { EmployeeRecordsList } from '../../components/employee-records-components/employee-records-list/employee-records-list';
import { EmployeeSearchByText } from '../../models/employee-search-by-text';
import {
  EmployeeRecordDateMode,
  EmployeeRecordStatusFilter,
  EmployeeRecordTab,
} from '../../models/employee-record';
import { EmployeeService } from '../../services/employee-service';
import { EmployeeRecordsStore } from '../../stores/employee-records-store';

@Component({
  selector: 'qfin-employee-records-component',
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatAutocompleteModule,
    MatDatepickerModule,
    MatSelectModule,
    LucideDynamicIcon,
    EmployeeRecordsList,
    EmployeeRecordsDetail,
  ],
  providers: [provideNativeDateAdapter(), DatePipe],
  templateUrl: './employee-records-component.html',
  styles: ``,
})
export class EmployeeRecordsComponent {
  public readonly EMPTY_UUID = EMPTY_UUID;
  readonly iconMap = APP_ICONS_MAP;

  readonly recordsStore = inject(EmployeeRecordsStore);
  readonly companyStore = inject(CompanyStore);
  private readonly employeeService = inject(EmployeeService);
  private readonly dateAdapter = inject(DateAdapter<Date>);

  readonly showFilterArea = signal<boolean>(true);

  readonly fromDate = signal<Date | null>(null);
  readonly toDate = signal<Date | null>(null);

  /** The range in use before the attendance tab forced today, restored on leaving it. */
  private readonly savedRange = signal<{
    from: Date | null;
    to: Date | null;
    mode: EmployeeRecordDateMode;
  } | null>(null);

  readonly employeeOptions = signal<EmployeeSearchByText[]>([]);
  readonly employeeSearchText = signal('');
  readonly selectedEmployee = signal<EmployeeSearchByText | null>(null);
  private readonly employeeSearch$ = new Subject<{ searchText: string }>();

  readonly tabs = this.recordsStore.tabs;
  readonly companies = this.companyStore.companies;

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

  readonly rows = this.recordsStore.rows;
  readonly activeTabConfig = this.recordsStore.activeTabConfig;
  readonly statusCounts = this.recordsStore.statusCounts;
  readonly tabCounts = this.recordsStore.tabCounts;

  readonly selectedRecordId = this.recordsStore.selectedRecordId;
  readonly hasSelectedRecord = this.recordsStore.hasSelectedRecord;

  readonly isAttendanceTab = computed(() => this.recordsStore.activeTab() === 'attendance');

  readonly statusChips = computed(() => {
    const counts = this.statusCounts();
    return [
      { key: 'all' as EmployeeRecordStatusFilter, label: 'All', count: counts.all },
      { key: 'pending' as EmployeeRecordStatusFilter, label: 'Pending', count: counts.pending },
      { key: 'approved' as EmployeeRecordStatusFilter, label: 'Approved', count: counts.approved },
      { key: 'rejected' as EmployeeRecordStatusFilter, label: 'Rejected', count: counts.rejected },
    ];
  });

  readonly isAllTime = computed(() => this.recordsStore.dateMode() === 'all');

  protected onSelectTab(tab: EmployeeRecordTab) {
    const previous = this.recordsStore.activeTab();
    if (previous === tab) return;

    if (tab === 'attendance') {
      // Attendance is one row per employee per day, so it opens on today rather
      // than inheriting a wide range from another tab.
      this.savedRange.set({
        from: this.fromDate(),
        to: this.toDate(),
        mode: this.recordsStore.dateMode(),
      });
      this.applyToday();
    } else if (previous === 'attendance') {
      this.restoreSavedRange();
    }

    this.recordsStore.setActiveTab(tab);
    this.closePanel();
  }

  private applyToday() {
    const today = new Date();
    this.fromDate.set(today);
    this.toDate.set(today);
    this.recordsStore.setDateMode('range');
    this.recordsStore.setDateRange(today, today);
  }

  private restoreSavedRange() {
    const saved = this.savedRange();
    if (!saved) return;

    this.fromDate.set(saved.from);
    this.toDate.set(saved.to);
    this.recordsStore.setDateMode(saved.mode);
    this.recordsStore.setDateRange(saved.from, saved.to);
    this.savedRange.set(null);
  }

  protected onSelectStatus(status: EmployeeRecordStatusFilter) {
    this.recordsStore.setStatusFilter(status);
    this.closePanel();
  }

  protected onSelectDateMode(mode: EmployeeRecordDateMode) {
    this.recordsStore.setDateMode(mode);
  }

  protected onSelectCompany(companyId: string | null) {
    this.recordsStore.setCompanyId(companyId || null);
  }

  protected onView(id: string) {
    this.recordsStore.openDetail(id);
  }

  protected closePanel() {
    this.recordsStore.closeDetail();
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
    this.recordsStore.setEmployeeId(this.selectedEmployee()?.id || null);
    this.recordsStore.setDateRange(this.fromDate(), this.toDate());
    this.closePanel();
  }

  protected resetFilters() {
    this.fromDate.set(null);
    this.toDate.set(null);
    this.selectedEmployee.set(null);
    this.employeeSearchText.set('');
    this.employeeOptions.set([]);
    this.savedRange.set(null);
    this.recordsStore.resetFilters();

    if (this.isAttendanceTab()) {
      this.applyToday();
    }

    this.closePanel();
  }

  protected pageChanged(event: PageEvent) {
    this.recordsStore.setPage(event.pageIndex);
    this.recordsStore.setPageSize(event.pageSize);
  }

  protected onSortChanged(sort: Sort) {
    if (!sort.direction) {
      return;
    }
    this.recordsStore.setSort(sort.active, sort.direction as 'asc' | 'desc');
  }

}
