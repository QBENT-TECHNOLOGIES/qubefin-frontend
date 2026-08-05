import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { ILeavePrayerItem, ILeavePrayerListItem } from '../models/leave-prayer';
import { ILeaveRequestItem, ILeaveRequestListItem } from '../models/leave-request';

@Injectable({
  providedIn: 'root',
})
export class LeavePrayerStore {
  private readonly basePath = `${ApiPaths.HRMS}/leave-prayer`;


  private readonly leaveRequestId = signal<string | undefined>(undefined);

  readonly leaveRequestsResource = httpResource<{
    items: ILeavePrayerListItem[];
    totalCount: number;
  }>(() => {
    return `${this.basePath}?searchText=${encodeURIComponent('')}&sortOn=&sortDirection=&pageIndex=0&pageSize=10`;
  });


  readonly leaveRequests = computed(() =>
    (this.leaveRequestsResource.value()?.items ?? []).map((item) => this.normalizeListItem())
  );

  readonly totalRecords = computed(
    () => this.leaveRequestsResource.value()?.totalCount ?? 0
  );

  readonly loading = computed(() => this.leaveRequestsResource.isLoading());
  readonly error = computed(() => this.leaveRequestsResource.error());

  readonly leaveRequestResource = httpResource<ILeaveRequestItem>(() => {
    const id = this.leaveRequestId();
    return id && id !== EMPTY_UUID ? `${this.basePath}/${id}` : undefined;
  });





  readonly leaveRequest = computed(() => {
    const item = this.leaveRequestResource.value();
    return item ? [] : undefined;
  });

  readonly leaveRequestLoading = computed(() => this.leaveRequestResource.isLoading());
  readonly leaveRequestError = computed(() => this.leaveRequestResource.error());

  setSearchQuery(query: string) {
    // this.searchQuery.set(query);
    // this.pageIndex.set(0);
  }

  setPage(index: number) {
    // this.pageIndex.set(index);
  }

  setPageSize(items: number) {
    // this.pageSize.set(items);
  }

  setSort(sort: string, direction: 'asc' | 'desc') {
    // this.sortOn.set(sort);
    // this.sortDirection.set(direction);
    // this.pageIndex.set(0);
  }

  refreshList() {
    this.leaveRequestsResource.reload();
  }

  setLeaveRequestId(id: string | undefined) {
    if (this.leaveRequestId() !== id) {
      this.leaveRequestId.set(id);
    }
  }

  refreshDetail() {
    this.leaveRequestResource.reload();
  }

  private normalizeListItem() {
    // return {
    //   ...item,
    //   fromDate: item.fromDate ? new Date(item.fromDate) : null,
    //   toDate: item.toDate ? new Date(item.toDate) : null,
    // };
  }

}
