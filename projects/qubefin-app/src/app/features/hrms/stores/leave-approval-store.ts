import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { ILeaveApprovalListItem } from '../models/leave-approval';

@Injectable({
  providedIn: 'root',
})
export class LeaveApprovalStore {
  private readonly basePath = `${ApiPaths.HRMS}/leaves/approval`;

  readonly searchedEmployeeIdQuery = signal('');
  readonly fromDateQuery = signal('');
  readonly toDateQuery = signal('');
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly sortOn = signal('fromDate');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');

  readonly leaveApprovalsResource = httpResource<{
    results: ILeaveApprovalListItem[];
    totalRecords: number;
  }>(() => ({
    url: `${this.basePath}` + '/search',
    method: 'POST',
    body: {
      fromDate: this.checkStringOrNull(this.fromDateQuery()),
      toDate: this.checkStringOrNull(this.toDateQuery()),
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

  readonly leaveApprovals = computed(() =>
    (this.leaveApprovalsResource.value()?.results ?? []).map(this.normalizeListItem),
  );
  readonly totalRecords = computed(() => this.leaveApprovalsResource.value()?.totalRecords ?? 0);

  readonly loading = computed(() => this.leaveApprovalsResource.isLoading());
  readonly error = computed(() => this.leaveApprovalsResource.error());

  setSearchedEmployeeIdQuery(query: string) {
    this.searchedEmployeeIdQuery.set(query);
    this.pageIndex.set(0);
  }

  setFromDateQuery(query: string) {
    this.fromDateQuery.set(query);
    this.pageIndex.set(0);
  }

  setToDateQuery(query: string) {
    this.toDateQuery.set(query);
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
    this.leaveApprovalsResource.reload();
  }

  private normalizeListItem(item: ILeaveApprovalListItem): ILeaveApprovalListItem {
    return {
      ...item,
      fromDate: item.fromDate ? new Date(item.fromDate) : null,
      toDate: item.toDate ? new Date(item.toDate) : null,
    };
  }
}
