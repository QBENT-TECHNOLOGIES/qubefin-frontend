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
import { AttendanceRegularizationsStore } from '../../stores/attendance-regularizations-store';
import { IAttendanceRegularization } from '../../models/attendance-regularization';
import { AttendanceRegularizationsList } from '../../components/attendance-regularizations/attendance-regularizations-list/attendance-regularizations-list';
import { AttendanceRegularizationView } from '../../components/attendance-regularizations/attendance-regularization-view/attendance-regularization-view';
import { AttendanceRegularizationApply } from '../../components/attendance-regularizations/attendance-regularization-apply/attendance-regularization-apply';
@Component({
  selector: 'qfin-attendance-regularizations',
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
    AttendanceRegularizationsList,
    AttendanceRegularizationView,
    AttendanceRegularizationApply,
  ],
  templateUrl: './attendance-regularizations.html',
  providers: [provideNativeDateAdapter(), DatePipe],
})
export class AttendanceRegularizations {
  public readonly EMPTY_UUID = EMPTY_UUID;
  readonly iconMap = APP_ICONS_MAP;
  readonly attendanceRegularizationsStore = inject(AttendanceRegularizationsStore);
  private readonly dateAdapter = inject(DateAdapter<Date>);
  private readonly datePipe = inject(DatePipe);
  readonly isViewMode = signal<boolean>(true);
  readonly showFilterArea = signal<boolean>(false);
  readonly selectedAttendanceRegularizationId = signal<string>(EMPTY_UUID);
  readonly searchModel = signal({
    tempSearch: '',
    fromDate: '',
    toDate: '',
    status: '',
  });
  readonly statuses = signal<string[]>(['Approved', 'Rejected', 'Pending']);
  readonly searchForm = form(this.searchModel);
  readonly attendanceRegularizations = this.attendanceRegularizationsStore.attendanceRegularization;
  constructor() {
    this.dateAdapter.setLocale('en-GB');
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
    this.attendanceRegularizationsStore.refreshList();
  }
  protected toggleFilterArea() {
    this.showFilterArea.update((v) => !v);
  }
  protected applyFilters() {
    this.attendanceRegularizationsStore.setFromDate(
      this.dateFormatter(this.searchForm.fromDate().value()),
    );
    this.attendanceRegularizationsStore.setToDate(
      this.dateFormatter(this.searchForm.toDate().value()),
    );
    this.attendanceRegularizationsStore.setStatus(this.searchForm.status().value());
    this.attendanceRegularizationsStore.setSearchQuery(this.searchForm.tempSearch().value());
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
    const current = this.attendanceRegularizationsStore.pageIndex();
    const next = current + delta;
    if (next >= 0) {
      this.attendanceRegularizationsStore.setPage(next);
    }
  }
  pageChanged(event: PageEvent) {
    this.attendanceRegularizationsStore.setPage(event.pageIndex);
    this.attendanceRegularizationsStore.setPageSize(event.pageSize);
  }
  onSortChanged(sort: Sort) {
    if (!sort.direction) {
      return;
    }

    this.attendanceRegularizationsStore.setSort(sort.active, sort.direction as 'asc' | 'desc');
  }
}
