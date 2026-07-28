import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { IAttendanceHistory } from '../models/attendance-history';
@Injectable({
  providedIn: 'root',
})
export class AttendanceHistoryStore {
  private readonly basePath = `${ApiPaths.HRMS}/attendances`;
  readonly fromDate = signal<string | null>(null);
  readonly toDate = signal<string | null>(null);
  readonly status = signal<string | null>(null);
  readonly searchQuery = signal<string | null>(null);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly sortOn = signal('assignedFrom');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');

  readonly attendanceHistoryResource = httpResource<{
    results: IAttendanceHistory[];
    totalRecords: number;
  }>(() => ({
    url: `${this.basePath}` + '/history',
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

  readonly attendanceHistory = computed(
    () => this.attendanceHistoryResource.value()?.results ?? [],
  );
  readonly totalRecords = computed(() => this.attendanceHistoryResource.value()?.totalRecords ?? 0);

  readonly loading = computed(() => this.attendanceHistoryResource.isLoading());
  readonly error = computed(() => this.attendanceHistoryResource.error());

  setFromDate(date: string | null) {
    this.fromDate.set(date);
  }
  setToDate(date: string | null) {
    this.toDate.set(date);
  }
  setStatus(status: string | null) {
    this.status.set(status);
  }

  setSearchQuery(query: string | null) {
    this.searchQuery.set(query);
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
    this.attendanceHistoryResource.reload();
  }
}
