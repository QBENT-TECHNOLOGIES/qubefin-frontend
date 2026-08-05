import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import {
  IApprovalRegularization,
  IAttendanceRegularization,
  IAttendanceRegularizationDetail,
  IAttendanceRegularizationDetailResponse,
  IAttendanceRegularizationEvent,
} from '../models/attendance-regularization';

@Injectable({
  providedIn: 'root',
})
export class ApprovalRegularizationStore {
  private readonly basePath = `${ApiPaths.HRMS}/attendances/regularizations`;
  private readonly regularizationId = signal<string | undefined>(undefined);
  readonly fromDate = signal<string | null>(null);
  readonly toDate = signal<string | null>(null);
  readonly searchQuery = signal<string | null>(null);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly sortOn = signal('appliedOn');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');

  readonly approvalReguralizationsResource = httpResource<{
    results: IApprovalRegularization[];
    totalRecords: number;
  }>(() => ({
    url: `${this.basePath}` + '/search-approval',
    method: 'POST',
    body: {
      fromDate: this.fromDate(),
      toDate: this.toDate(),
      searchText: this.searchQuery(),
      sortOn: this.sortOn(),
      sortDirection: this.sortDirection(),
      pageIndex: this.pageIndex(),
      pageSize: this.pageSize(),
    },
  }));
  readonly approvalRegularization = computed<IApprovalRegularization[]>(
    () => this.approvalReguralizationsResource.value()?.results ?? [],
  );
  readonly totalRecords = computed(
    () => this.approvalReguralizationsResource.value()?.totalRecords ?? 0,
  );

  readonly loading = computed(() => this.approvalReguralizationsResource.isLoading());
  readonly error = computed(() => this.approvalReguralizationsResource.error());
  // readonly regularizationResource = httpResource<IAttendanceRegularizationDetail>(() => {
  //   const id = this.regularizationId();

  //   return id && id !== EMPTY_UUID ? `${this.basePath}/${id}` : undefined;
  // });
  readonly regularizationResource = httpResource<IAttendanceRegularizationDetailResponse>(() => {
    const id = this.regularizationId();

    return id && id !== EMPTY_UUID ? `${this.basePath}/${id}` : undefined;
  });
  readonly regularization = computed(() => {
    const item = this.regularizationResource.value()?.response;

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
  //  setStatus(status: string | null) {
  //    this.status.set(status);
  //  }

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
    this.approvalReguralizationsResource.reload();
  }
  refreshDetail() {
    this.regularizationResource.reload();
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

      events: (item.events ?? []).map(
        (event): IAttendanceRegularizationEvent => ({
          approvalCategory: event.approvalCategory,
          eventDate: event.eventDate ? new Date(event.eventDate).toISOString() : event.eventDate,
          remarks: event.remarks,
          senderDesignation: event.senderDesignation,
          receiverDesignation: event.receiverDesignation,
          eventCategory: event.eventCategory,
          eventStatus: event.eventStatus,
          eventButtonText: event.eventButtonText,
        }),
      ),
    };
  }

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
