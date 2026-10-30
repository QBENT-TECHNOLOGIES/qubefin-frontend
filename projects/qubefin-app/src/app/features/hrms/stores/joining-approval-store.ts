import { HttpClient, httpResource } from '@angular/common/http';
import { computed, inject, Injectable, linkedSignal, signal } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { IJoiningApprovalListItem, IJoiningInfoAction } from '../models/joining-approval';

@Injectable({
  providedIn: 'root',
})
export class JoiningApprovalStore {
  private readonly basePath = `${ApiPaths.HRMS}/employees/joining-info`;
  private readonly httpClient = inject(HttpClient);

  readonly searchedEmployeeIdQuery = signal('');
  readonly fromDate = signal<string | null>(null);
  readonly toDate = signal<string | null>(null);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly sortOn = signal('createdOn');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');

  readonly joiningApprovalResource = httpResource<{
    results: IJoiningApprovalListItem[];
    totalRecords: number;
    hasAccess: boolean;
  }>(() => ({
    url: `${this.basePath}/approval/search`,
    method: 'POST',
    body: {
      fromDate: this.checkStringOrNull(this.fromDate()),
      toDate: this.checkStringOrNull(this.toDate()),
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

  readonly joiningApprovals = computed<IJoiningApprovalListItem[]>(
    () => this.joiningApprovalResource.value()?.results ?? [],
  );
  readonly totalRecords = computed(() => this.joiningApprovalResource.value()?.totalRecords ?? 0);
  /**
   * Only the MD of a company gets the joining queue; everyone else gets hasAccess false.
   * Holds the last known answer while a reload is in flight, so the tab doesn't flicker on filtering.
   */
  readonly hasAccess = linkedSignal<
    { hasAccess: boolean } | undefined,
    boolean
  >({
    source: () => this.joiningApprovalResource.value(),
    computation: (value, previous) => value?.hasAccess ?? previous?.value ?? false,
  });
  readonly loading = computed(() => this.joiningApprovalResource.isLoading());
  readonly error = computed(() => this.joiningApprovalResource.error());

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

  takeAction(payload: IJoiningInfoAction) {
    return this.httpClient.post<string>(`${this.basePath}/action`, payload);
  }

  refreshList() {
    this.joiningApprovalResource.reload();
  }
}
