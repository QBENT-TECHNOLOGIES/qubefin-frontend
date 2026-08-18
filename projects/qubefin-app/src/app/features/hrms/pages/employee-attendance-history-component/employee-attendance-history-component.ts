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
import { EmployeeSearchByText, EmployeeSearchResponse } from '../../models/employee-search-by-text';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { EmployeeService } from '../../services/employee-service';
import { EmployeeAttendanceHistoryList } from '../../components/employee-atendance-history-component/employee-attendance-history-list/employee-attendance-history-list';
import { EmployeeAttendanceHistoryStore } from '../../stores/employee-attendance-history-store';
import { EmployeeAttendanceHistoryView } from '../../components/employee-atendance-history-component/employee-attendance-history-view/employee-attendance-history-view';
import { IEmployeeAttendanceHistory } from '../../models/employee-attendance-history';
@Component({
  selector: 'qfin-employee-attendance-history-component',
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
    EmployeeAttendanceHistoryList,
    EmployeeAttendanceHistoryView,
    MatAutocompleteModule,
  ],
  providers: [DatePipe, provideNativeDateAdapter()],
  templateUrl: './employee-attendance-history-component.html',
  styles: ``,
})
export class EmployeeAttendanceHistoryComponent {
  public readonly EMPTY_UUID = EMPTY_UUID;
  readonly iconMap = APP_ICONS_MAP;

  private readonly employeeService = inject(EmployeeService);

  readonly employeeAttendanceHistoryStore = inject(EmployeeAttendanceHistoryStore);
  private readonly dateAdapter = inject(DateAdapter<Date>);
  private readonly datePipe = inject(DatePipe);

  readonly isViewMode = signal<boolean>(true);
  readonly showFilterArea = signal<boolean>(false);
  readonly employeeOptions = signal<EmployeeSearchByText[]>([]);
  readonly employeeSearchText = signal('');
  private readonly employeeSearch$ = new Subject<{ searchText: string }>();
  // readonly selectedEmployee = signal<EmployeeSearchByText | null>(null);
  readonly selectedAttendanceHistory = signal<IEmployeeAttendanceHistory | null>(null);

  readonly searchModel = signal({
    tempSearch: '',
    fromDate: '',
    toDate: '',
    status: '',
  });
  readonly statuses = signal<string[]>([
    'On Time',
    'Late Entry',
    'Early Exit',
    'Late Entry & Early Exit',
  ]);

  readonly searchForm = form(this.searchModel);
  readonly employeeAttendanceHistories =
    this.employeeAttendanceHistoryStore.employeeAttendanceHistory;
  constructor() {
    this.dateAdapter.setLocale('en-GB');
    // this.employeeSearch$
    //   .pipe(
    //     debounceTime(250),
    //     distinctUntilChanged(),
    //     switchMap((x) => this.employeeService.getEmployeesBySearchText(x)),
    //   )
    //   .subscribe((response: EmployeeSearchResponse) => {
    //     this.employeeOptions.set(
    //       response.value?.employees ??
    //         response.valueOrDefault?.employees ??
    //         response.employees ??
    //         [],
    //     );
    //   });
  }

  protected onView(item: IEmployeeAttendanceHistory) {
    this.selectedAttendanceHistory.set(item);
    this.isViewMode.set(true);
  }

  protected closePanel() {
    this.selectedAttendanceHistory.set(null);
    this.isViewMode.set(true);
  }
  protected toggleFilterArea() {
    this.showFilterArea.update((v) => !v);
  }
  protected applyFilters() {
    this.employeeAttendanceHistoryStore.setFromDate(
      this.dateFormatter(this.searchForm.fromDate().value()),
    );
    this.employeeAttendanceHistoryStore.setToDate(
      this.dateFormatter(this.searchForm.toDate().value()),
    );
    this.employeeAttendanceHistoryStore.setStatus(this.searchForm.status().value());

    this.employeeAttendanceHistoryStore.setSearchQuery(this.searchForm.tempSearch().value());
    // this.employeeAttendanceHistoryStore.setEmployeeId(this.selectedEmployee()?.id || '');
  }

  protected resetFilters() {
    this.searchModel.update((m) => ({
      ...m,
      tempSearch: '',
      fromDate: '',
      toDate: '',
      status: '',
    }));
    this.employeeSearchText.set('');
    // this.selectedEmployee.set(null);
    this.employeeOptions.set([]);
    this.applyFilters();
  }

  // protected searchEmployees(searchText: string) {
  //   this.employeeSearchText.set(searchText);

  //   if (!searchText.trim()) {
  //     this.employeeOptions.set([]);
  //     this.employeeSearchText.set('');
  //     // this.selectedEmployee.set(null);
  //     return;
  //   }

  //   this.employeeSearch$.next({ searchText });
  // }
  // protected selectEmployee(event: MatAutocompleteSelectedEvent) {
  //   const employee = event.option.value as EmployeeSearchByText;
  //   this.selectedEmployee.set(employee);
  //   this.employeeSearchText.set(employee.employeeName);
  // }

  displayEmployeeName(employee: EmployeeSearchByText | string | null): string {
    if (!employee) return '';
    return typeof employee === 'string' ? employee : employee.employeeName;
  }
  protected changePage(delta: number) {
    const current = this.employeeAttendanceHistoryStore.pageIndex();
    const next = current + delta;
    if (next >= 0) {
      this.employeeAttendanceHistoryStore.setPage(next);
    }
  }
  pageChanged(event: PageEvent) {
    this.employeeAttendanceHistoryStore.setPage(event.pageIndex);
    this.employeeAttendanceHistoryStore.setPageSize(event.pageSize);
  }
  onSortChanged(sort: Sort) {
    if (!sort.direction) {
      return;
    }

    this.employeeAttendanceHistoryStore.setSort(sort.active, sort.direction as 'asc' | 'desc');
  }
  private dateFormatter(date: any) {
    if (!date || date === null || date === '') {
      return null;
    }
    return this.datePipe.transform(date, 'yyyy-MM-dd');
  }
}
