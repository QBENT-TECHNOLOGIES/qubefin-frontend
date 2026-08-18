import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import {
  IAttendanceRegularization,
  IAttendanceRegularizationDetail,
  IAttendanceRegularizationEvent,
} from '../models/attendance-regularization';
import { Utility } from '../models/employee-detail';

@Injectable({
  providedIn: 'root',
})
export class AttendanceRegularizationsStore {
  private readonly basePath = `${ApiPaths.HRMS}/attendances/regularizations`;
  private readonly regularizationId = signal<string | undefined>(undefined);
  readonly fromDate = signal<string | null>(null);
  readonly toDate = signal<string | null>(null);
  readonly status = signal<string | null>(null);
  readonly searchQuery = signal<string | null>(null);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly sortOn = signal('appliedOn');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');

  readonly attendanceReguralizationsResource = httpResource<{
    results: IAttendanceRegularization[];
    totalRecords: number;
  }>(() => ({
    url: `${this.basePath}` + '/search',
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
  readonly attendanceRegularization = computed<IAttendanceRegularization[]>(
    () => this.attendanceReguralizationsResource.value()?.results ?? [],
  );
  readonly totalRecords = computed(
    () => this.attendanceReguralizationsResource.value()?.totalRecords ?? 0,
  );

  readonly loading = computed(() => this.attendanceReguralizationsResource.isLoading());
  readonly error = computed(() => this.attendanceReguralizationsResource.error());
  // readonly regularizationResource = httpResource<IAttendanceRegularizationDetail>(() => {
  //   const id = this.regularizationId();

  //   return id && id !== EMPTY_UUID ? `${this.basePath}/${id}` : undefined;
  // });
  readonly regularizationResource = httpResource<IAttendanceRegularizationDetail>(() => {
    const id = this.regularizationId();

    return id && id !== EMPTY_UUID ? `${this.basePath}/${id}` : undefined;
  });
  readonly regularization = computed(() => {
    const item = this.regularizationResource.value();

    return item ? this.normalizeItem(item) : undefined;
  });

  readonly regularizationUnitLoading = computed(() => this.regularizationResource.isLoading());
  readonly regularizationUnitError = computed(() => this.regularizationResource.error());

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
    this.attendanceReguralizationsResource.reload();
  }

  setRegularizationId(id: string | undefined) {
    if (this.regularizationId() !== id) {
      this.regularizationId.set(id);
    }
  }
  private normalizeItem(item: IAttendanceRegularizationDetail): IAttendanceRegularizationDetail {
    return {
      ...item,

      createdOn: item.createdOn ? new Date(item.createdOn).toISOString() : item.createdOn,

      regularizationDates: this.normalizeRegularizationDates(item.regularizationDates),

      events: item.events
        ? item.events.map((h) => ({
            ...h,
            eventDate: h.eventDate ? new Date(h.eventDate) : '',
          }))
        : [],
    };
  }
  readonly utilityResource = httpResource<Utility[]>(() => {
    return `${ApiPaths.GLOBAL}/utilities`;
  });
  readonly utilities = computed(() => this.utilityResource.value() ?? []);
  private normalizeRegularizationDates(dates: string | null): string | null {
    if (!dates) {
      return null;
    }

    try {
      const parsedDates: string[] = JSON.parse(dates);

      return parsedDates.join(', ');
    } catch {
      return dates;
    }
  }
}
