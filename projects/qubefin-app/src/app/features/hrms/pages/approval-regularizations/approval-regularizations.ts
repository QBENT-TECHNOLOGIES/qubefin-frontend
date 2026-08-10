import { Component, computed, effect, inject, signal } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { CommonModule } from '@angular/common';
import { form, FormField } from '@angular/forms/signals';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { EMPTY_UUID, RouteMeta } from 'qubefin-core';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { AttendanceRegularizationView } from '../../components/attendance-regularizations/attendance-regularization-view/attendance-regularization-view';
import { ApprovalRegularizationStore } from '../../stores/approval-regularizations-store';
import { ApprovalRegulariztionList } from '../../components/approval-regularizations/approval-regulariztion-list/approval-regulariztion-list';
import { EmployeeSearchByText, EmployeeSearchResponse } from '../../models/employee-search-by-text';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { EmployeeService } from '../../services/employee-service';
@Component({
  selector: 'qfin-approval-regularizations',
  imports: [
    FormField,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatIconModule,
    MatTooltipModule,
    LucideDynamicIcon,
    CommonModule,
    MatDatepickerModule,
    MatSelectModule,
    ApprovalRegulariztionList,
    AttendanceRegularizationView,
    MatAutocompleteModule,
  ],
  providers: [DatePipe, provideNativeDateAdapter()],
  templateUrl: './approval-regularizations.html',
  styles: ``,
})
export class ApprovalRegularizations {
  public readonly EMPTY_UUID = EMPTY_UUID;
  readonly iconMap = APP_ICONS_MAP;
  private readonly employeeService = inject(EmployeeService);
  readonly approvalRegularizationsStore = inject(ApprovalRegularizationStore);
  private readonly dateAdapter = inject(DateAdapter<Date>);
  private readonly datePipe = inject(DatePipe);
  readonly isViewMode = signal<boolean>(true);
  readonly showFilterArea = signal<boolean>(false);
  readonly employeeOptions = signal<EmployeeSearchByText[]>([]);
  readonly employeeSearchText = signal('');
  private readonly employeeSearch$ = new Subject<{ searchText: string }>();
  readonly selectedEmployee = signal<EmployeeSearchByText | null>(null);
  readonly selectedAttendanceRegularizationId = signal<string>(EMPTY_UUID);
  readonly searchModel = signal({
    tempSearch: '',
    fromDate: '',
    toDate: '',
  });
  readonly statuses = signal<string[]>(['Approved', 'Rejected', 'Pending']);
  readonly searchForm = form(this.searchModel);
  readonly attendanceRegularizations = this.approvalRegularizationsStore.approvalRegularization;
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
    //
    //     this.employeeSearch$
    // .pipe(
    //   debounceTime(250),
    //   distinctUntilChanged((prev, curr) => prev.searchText === curr.searchText),
    //   switchMap((x) => this.employeeService.getEmployeesBySearchText(x)),
    // )
    // .subscribe((response: EmployeeSearchResponse) => {
    //   this.employeeOptions.set(
    //     response.value?.employees ??
    //       response.valueOrDefault?.employees ??
    //       response.employees ??
    //       [],
    //   );
    // });
  }
  readonly hasSelectedRegularization = computed(
    () => this.selectedAttendanceRegularizationId() !== EMPTY_UUID || !this.isViewMode(),
  );

  protected onAdd() {
    this.isViewMode.set(false);
    this.selectedAttendanceRegularizationId.set(EMPTY_UUID);
  }
  protected onView(id: string) {
    this.selectedAttendanceRegularizationId.set(id);
    this.isViewMode.set(true);
  }
  protected onEdit() {
    // this.isViewMode.set(false);
  }
  protected closePanel() {
    this.selectedAttendanceRegularizationId.set(EMPTY_UUID);
    this.isViewMode.set(true);
  }
  protected onSaveSuccess() {
    this.closePanel();
    this.approvalRegularizationsStore.refreshList();
  }
  protected toggleFilterArea() {
    this.showFilterArea.update((v) => !v);
  }
  protected applyFilters() {
    this.approvalRegularizationsStore.setFromDate(
      this.dateFormatter(this.searchForm.fromDate().value()),
    );
    this.approvalRegularizationsStore.setToDate(
      this.dateFormatter(this.searchForm.toDate().value()),
    );
    // this.approvalRegularizationsStore.setStatus(this.searchForm.status().value());
    this.approvalRegularizationsStore.setSearchQuery(this.searchForm.tempSearch().value());
    this.approvalRegularizationsStore.setEmployeeId(this.selectedEmployee()?.id || '');
  }
  private dateFormatter(date: any) {
    if (!date || date === null || date === '') {
      return null;
    }
    return this.datePipe.transform(date, 'yyyy-MM-dd');
  }
  protected resetFilters() {
    this.searchModel.update((m) => ({
      ...m,
      tempSearch: '',
      fromDate: '',
      toDate: '',
    }));
    this.employeeSearchText.set('');
    this.selectedEmployee.set(null);
    this.employeeOptions.set([]);
    this.applyFilters();
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
  protected changePage(delta: number) {
    const current = this.approvalRegularizationsStore.pageIndex();
    const next = current + delta;
    if (next >= 0) {
      this.approvalRegularizationsStore.setPage(next);
    }
  }
  pageChanged(event: PageEvent) {
    this.approvalRegularizationsStore.setPage(event.pageIndex);
    this.approvalRegularizationsStore.setPageSize(event.pageSize);
  }
  onSortChanged(sort: Sort) {
    if (!sort.direction) {
      return;
    }

    this.approvalRegularizationsStore.setSort(sort.active, sort.direction as 'asc' | 'desc');
  }
}
