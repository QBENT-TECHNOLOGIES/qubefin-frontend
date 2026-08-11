import { httpResource } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { ILeavePrayerItem, ILeavePrayerListItem } from '../models/leave-prayer';
import {
  ILeaveRequestItem,
  ILeaveRequestListItem,
  ILeaveTypeBalance,
} from '../models/leave-request';
import { SessionService } from '../../../services/session.service';

@Injectable({
  providedIn: 'root',
})
export class LeavePrayerStore {
  private readonly basePath = `${ApiPaths.HRMS}/leave/prayers`;

  private readonly leavePrayerId = signal<string | undefined>(undefined);
  private readonly sessionService = inject(SessionService);
  readonly yearQuery = signal<number | null>(new Date().getFullYear());
  private readonly employeeId = this.sessionService.employeeId;
  readonly leaveTypeBalancesResource = httpResource<ILeaveTypeBalance[]>(() => {
    return this.employeeId
      ? `${ApiPaths.HRMS}/leave-types/prayer-balances/${this.employeeId}`
      : undefined;
  });

  readonly leaveTypeBalances = computed(
    () => this.leaveTypeBalancesResource.value()?.filter((m) => m.leaveBalance >= 1) ?? [],
  );
  readonly leaveTypeBalancesLoading = computed(() => this.leaveTypeBalancesResource.isLoading());
  readonly leavePrayersResource = httpResource<ILeavePrayerListItem[]>(() => {
    const year = this.yearQuery();
    return `${this.basePath}/by-year/${year}`;
  });

  readonly leavePrayers = computed(() => this.leavePrayersResource.value() ?? []);

  // readonly totalRecords = computed(
  //   () => this.leaveRequestsResource.value()?.totalCount ?? 0
  // );

  readonly loading = computed(() => this.leavePrayersResource.isLoading());
  readonly error = computed(() => this.leavePrayersResource.error());

  readonly leavePrayerResource = httpResource<{ response: ILeavePrayerItem }>(() => {
    const id = this.leavePrayerId();
    return id && id !== EMPTY_UUID ? `${this.basePath}/${id}/${this.employeeId}` : undefined;
  });

  readonly leavePrayer = computed(() => {
    const item = this.leavePrayerResource.value()?.response;
    return item ? item : undefined;
  });

  readonly leavePrayerLoading = computed(() => this.leavePrayerResource.isLoading());
  readonly leavePrayerError = computed(() => this.leavePrayerResource.error());
  setYearQuery(year: number) {
    this.yearQuery.set(year);
  }
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
    this.leavePrayersResource.reload();
  }

  setLeaveRequestId(id: string | undefined) {
    if (this.leavePrayerId() !== id) {
      this.leavePrayerId.set(id);
    }
  }

  refreshDetail() {
    this.leavePrayerResource.reload();
  }

  private normalizeListItem(items: any) {
    // return {
    //   ...item,
    //   fromDate: item.fromDate ? new Date(item.fromDate) : null,
    //   toDate: item.toDate ? new Date(item.toDate) : null,
    // };
  }
}
