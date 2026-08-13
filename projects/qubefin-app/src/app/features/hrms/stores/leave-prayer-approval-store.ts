import { computed, inject, Injectable, signal } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { SessionService } from '../../../services/session.service';
import { ILeavePrayerApprovalListItem } from '../models/leave-prayer';
import { httpResource } from '@angular/common/http';
@Injectable({
  providedIn: 'root',
})
export class LeavePrayerApprovalStore {
  private readonly basePath = `${ApiPaths.HRMS}/leave/prayers`;
  private readonly leavePrayerId = signal<string | undefined>(undefined);
  private readonly sessionService = inject(SessionService);
  readonly searchedEmployeeIdQuery = signal('');
  readonly fromDate = signal<string | null>(null);
  readonly toDate = signal<string | null>(null);
  readonly searchQuery = signal<string | null>(null);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly sortOn = signal('appliedOn');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');
  readonly leavePrayersApprovalResource = httpResource<{
    results: ILeavePrayerApprovalListItem[];
    totalRecords: number;
  }>(() => ({
    url: `${this.basePath}` + '/approval/search',
    method: 'POST',
    body: {
      fromDate: this.checkStringOrNull(this.fromDate()),
      toDate: this.checkStringOrNull(this.toDate()),
      searchText: this.checkStringOrNull(this.searchQuery()),
      searchEmployeeId: this.checkStringOrNull(this.searchedEmployeeIdQuery()),
      sortOn: this.sortOn(),
      sortDirection: this.sortDirection(),
      pageIndex: this.pageIndex(),
      pageSize: this.pageSize(),
    },
  }));
  private checkStringOrNull(value: any): any {
    return value === '' || value === null ? null : value;
  }
  readonly leavePrayersApprovals = computed<ILeavePrayerApprovalListItem[]>(
    () => this.leavePrayersApprovalResource.value()?.results ?? [],
  );
  readonly totalRecords = computed(
    () => this.leavePrayersApprovalResource.value()?.totalRecords ?? 0,
  );
  readonly loading = computed(() => this.leavePrayersApprovalResource.isLoading());
  readonly error = computed(() => this.leavePrayersApprovalResource.error());

  setSearchedEmployeeIdQuery(query: string) {
    this.searchedEmployeeIdQuery.set(query);
    this.pageIndex.set(0);
  }

  setFromDateQuery(query: string) {
    this.fromDate.set(query);
    this.pageIndex.set(0);
  }

  setToDateQuery(query: string) {
    this.toDate.set(query);
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
    this.leavePrayersApprovalResource.reload();
  }
}
