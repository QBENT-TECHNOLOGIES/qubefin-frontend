import { Component, inject, signal } from '@angular/core';
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
import { form, FormField, readonly, Schema, schema } from '@angular/forms/signals';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { EMPTY_UUID } from 'qubefin-core';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { EmployeeSearchByText } from '../../models/employee-search-by-text';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { EmployeeAttendanceHistoryList } from '../../components/employee-atendance-history-component/employee-attendance-history-list/employee-attendance-history-list';
import { EmployeeAttendanceHistoryStore } from '../../stores/employee-attendance-history-store';
import { EmployeeAttendanceHistoryView } from '../../components/employee-atendance-history-component/employee-attendance-history-view/employee-attendance-history-view';
import { IEmployeeAttendanceHistory } from '../../models/employee-attendance-history';
export interface ISearchModel {
  tempSearch: string;
  fromDate: string;
  toDate: string;
  status: string;
}
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

  readonly employeeAttendanceHistoryStore = inject(EmployeeAttendanceHistoryStore);
  private readonly dateAdapter = inject(DateAdapter<Date>);
  private readonly datePipe = inject(DatePipe);

  readonly isViewMode = signal<boolean>(true);
  readonly showFilterArea = signal<boolean>(false);
  readonly employeeOptions = signal<EmployeeSearchByText[]>([]);
  readonly employeeSearchText = signal('');
  readonly selectedAttendanceHistory = signal<IEmployeeAttendanceHistory | null>(null);

  readonly searchModel = signal<ISearchModel>({
    tempSearch: '',
    fromDate: '',
    toDate: '',
    status: '',
  });
  readonly searchSchema: Schema<ISearchModel> = schema((path) => {
    readonly(path.fromDate, { when: () => true });
    readonly(path.toDate, { when: () => true });
  });
  readonly statuses = signal<string[]>([
    'On Time',
    'Late Entry',
    'Early Exit',
    'Late Entry & Early Exit',
  ]);

  readonly searchForm = form(this.searchModel, this.searchSchema);
  readonly employeeAttendanceHistories =
    this.employeeAttendanceHistoryStore.employeeAttendanceHistory;
  constructor() {
    this.dateAdapter.setLocale('en-GB');
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
    this.employeeOptions.set([]);
    this.applyFilters();
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
