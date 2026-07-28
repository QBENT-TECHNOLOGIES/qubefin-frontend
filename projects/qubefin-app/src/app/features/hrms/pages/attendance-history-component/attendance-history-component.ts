import { Component, computed, effect, inject, signal } from '@angular/core';
import { AttendanceHistoryStore } from '../../stores/attendance-history-store';
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
import { AttendanceHistoryComponentList } from '../../components/attendance-history-components/attendance-history-component-list/attendance-history-component-list';
import { EMPTY_UUID } from 'qubefin-core';
@Component({
  selector: 'qfin-attendance-history-component',
  imports: [
    FormField,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatIconModule,
    MatTooltipModule,
    LucideDynamicIcon,
    CommonModule,
    AttendanceHistoryComponentList,
    MatDatepickerModule,
    MatSelectModule,
  ],
  templateUrl: './attendance-history-component.html',
  providers: [provideNativeDateAdapter(), DatePipe],
})
export class AttendanceHistoryComponent {
  readonly attendanceHistoryStore = inject(AttendanceHistoryStore);

  public readonly EMPTY_UUID = EMPTY_UUID;
  private readonly dateAdapter = inject(DateAdapter<Date>);
  private readonly datePipe = inject(DatePipe);

  readonly isViewMode = signal<boolean>(true);
  readonly showFilterArea = signal<boolean>(false);
  readonly attendanceId = signal<string>(EMPTY_UUID);

  readonly statuses = ['On Time', 'Late Entry', 'Early Exit', 'Late Entry & Early Exit'];
  readonly searchModel = signal({
    tempSearch: '',
    fromDate: '',
    toDate: '',
    status: '',
  });

  readonly searchForm = form(this.searchModel);
  readonly attendanceHistories = this.attendanceHistoryStore.attendanceHistory;

  constructor() {
    this.dateAdapter.setLocale('en-GB');
  }
  protected onView(id: string) {
    // this.selectedSurveyCommitteeId.set(id);
    // this.isViewMode.set(true);
  }
  protected onEdit() {
    // this.isViewMode.set(false);
  }
  protected onAdd() {
    // this.isViewMode.set(false);
    // this.selectedSurveyCommitteeId.set(EMPTY_UUID);
  }
  protected closePanel() {
    // this.selectedSurveyCommitteeId.set(EMPTY_UUID);
    // this.isViewMode.set(true);
  }

  protected toggleFilterArea() {
    this.showFilterArea.update((v) => !v);
  }
  protected applyFilters() {
    this.attendanceHistoryStore.setFromDate(this.dateFormatter(this.searchForm.fromDate().value()));
    this.attendanceHistoryStore.setToDate(this.dateFormatter(this.searchForm.toDate().value()));
    this.attendanceHistoryStore.setStatus(this.searchForm.status().value());
    this.attendanceHistoryStore.setSearchQuery(this.searchForm.tempSearch().value());
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
      status: '',
    }));
    this.applyFilters();
  }

  protected changePage(delta: number) {
    const current = this.attendanceHistoryStore.pageIndex();
    const next = current + delta;
    if (next >= 0) {
      this.attendanceHistoryStore.setPage(next);
    }
  }
  pageChanged(event: PageEvent) {
    this.attendanceHistoryStore.setPage(event.pageIndex);
    this.attendanceHistoryStore.setPageSize(event.pageSize);
  }
  onSortChanged(sort: Sort) {
    if (!sort.direction) {
      return;
    }

    this.attendanceHistoryStore.setSort(sort.active, sort.direction as 'asc' | 'desc');
  }
}
