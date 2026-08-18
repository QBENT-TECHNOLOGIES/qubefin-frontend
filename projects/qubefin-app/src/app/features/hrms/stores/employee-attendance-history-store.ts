import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { IEmployeeAttendanceHistory } from '../models/employee-attendance-history';
@Injectable({
  providedIn: 'root',
})
export class EmployeeAttendanceHistoryStore {
  private readonly basePath = `${ApiPaths.HRMS}/attendances`;

  readonly searchEmployeeId = signal<string | null>(null);
  readonly fromDate = signal<string | null>(null);
  readonly toDate = signal<string | null>(null);
  readonly status = signal<string | null>(null);
  readonly searchQuery = signal<string | null>(null);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly sortOn = signal('attendanceDate');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');

  readonly employeeAttendanceHistoryResource = httpResource<{
    results: IEmployeeAttendanceHistory[];
    totalRecords: number;
  }>(() => ({
    url: `${this.basePath}` + '/history-all',
    method: 'POST',
    body: {
      fromDate: this.fromDate(),
      toDate: this.toDate(),
      status: this.status(),
      searchText: this.searchQuery(),
      sortOn: this.sortOn(),
      sortDirection: this.sortDirection(),
      pageIndex: this.pageIndex(),
      pageSize: this.pageSize(),
    },
  }));

  readonly employeeAttendanceHistory = computed(
    () => this.employeeAttendanceHistoryResource.value()?.results ?? [],
  );
  readonly totalRecords = computed(
    () => this.employeeAttendanceHistoryResource.value()?.totalRecords ?? 0,
  );
  readonly loading = computed(() => this.employeeAttendanceHistoryResource.isLoading());
  readonly error = computed(() => this.employeeAttendanceHistoryResource.error());

  setFromDate(date: string | null) {
    this.fromDate.set(date);
    this.pageIndex.set(0);
  }
  setToDate(date: string | null) {
    this.toDate.set(date);
    this.pageIndex.set(0);
  }
  setStatus(status: string | null) {
    this.status.set(status);
    this.pageIndex.set(0);
  }

  setSearchQuery(query: string | null) {
    this.searchQuery.set(query);
    this.pageIndex.set(0);
  }
  setEmployeeId(id: string | null) {
    this.searchEmployeeId.set(id);
    this.pageIndex.set(0);
  }
  setPage(index: number) {
    this.pageIndex.set(index);
  }

  setPageSize(items: number) {
    this.pageSize.set(items);
  }

  setSort(sort: string, direction: 'asc' | 'desc') {
    this.sortOn.set(sort);
    this.sortDirection.set(direction);
    this.pageIndex.set(0);
  }

  refreshList() {
    this.employeeAttendanceHistoryResource.reload();
  }
}
