import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { ApiPaths } from 'qubefin-core';

import {
  EMPLOYEE_RECORD_TABS,
  EmployeeRecordDateMode,
  EmployeeRecordStatusFilter,
  EmployeeRecordTab,
  IEmployeeRecordCounts,
  IEmployeeRecordDetail,
  IEmployeeRecordRow,
  IEmployeeRecordSearchResponse,
  IEmployeeRecordStatusCounts,
  IEmployeeRecordTabConfig,
} from '../models/employee-record';

const EMPTY_COUNTS: IEmployeeRecordCounts = {
  leave: 0,
  regularization: 0,
  prayer: 0,
  attendance: 0,
  fitness: 0,
};

const EMPTY_STATUS_COUNTS: IEmployeeRecordStatusCounts = {
  all: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  cancelled: 0,
};

@Injectable({
  providedIn: 'root',
})
export class EmployeeRecordsStore {
  private readonly basePath = `${ApiPaths.HRMS}/employees/records`;

  readonly tabs = EMPLOYEE_RECORD_TABS;

  readonly activeTab = signal<EmployeeRecordTab>('leave');
  readonly statusFilter = signal<EmployeeRecordStatusFilter>('all');
  readonly dateMode = signal<EmployeeRecordDateMode>('range');

  readonly employeeId = signal<string | null>(null);
  readonly companyId = signal<string | null>(null);
  readonly fromDate = signal<Date | null>(null);
  readonly toDate = signal<Date | null>(null);
  readonly searchText = signal<string | null>(null);

  readonly pageIndex = signal(0);
  readonly pageSize = signal(20);
  readonly sortOn = signal('');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');

  readonly recordsResource = httpResource<IEmployeeRecordSearchResponse>(() => ({
    url: `${this.basePath}/search`,
    method: 'POST',
    body: {
      recordType: this.activeTab(),
      searchEmployeeId: this.employeeId(),
      companyId: this.companyId(),
      fromDate: this.effectiveFromDate(),
      toDate: this.effectiveToDate(),
      status: this.statusFilter(),
      searchText: this.searchText(),
      sortOn: this.sortOn(),
      sortDirection: this.sortDirection(),
      pageIndex: this.pageIndex(),
      pageSize: this.pageSize(),
      includeCounts: true,
    },
  }));

  private readonly effectiveFromDate = computed(() =>
    this.dateMode() === 'all' ? null : this.toIsoDate(this.fromDate()),
  );

  private readonly effectiveToDate = computed(() =>
    this.dateMode() === 'all' ? null : this.toIsoDate(this.toDate()),
  );

  readonly activeTabConfig = computed<IEmployeeRecordTabConfig>(
    () => this.tabs.find((tab) => tab.key === this.activeTab()) ?? this.tabs[0],
  );

  readonly rows = computed<IEmployeeRecordRow[]>(() => this.recordsResource.value()?.results ?? []);
  readonly totalRecords = computed(() => this.recordsResource.value()?.totalRecords ?? 0);
  readonly tabCounts = computed(() => this.recordsResource.value()?.counts ?? EMPTY_COUNTS);
  readonly statusCounts = computed(
    () => this.recordsResource.value()?.statusCounts ?? EMPTY_STATUS_COUNTS,
  );

  readonly loading = computed(() => this.recordsResource.isLoading());
  readonly error = computed(() => this.recordsResource.error());

  // The record type is captured when the row is opened rather than read live, so
  // switching tabs can never request the open id under the newly selected type.
  private readonly detailRef = signal<{ recordType: EmployeeRecordTab; id: string } | null>(null);

  readonly detailResource = httpResource<IEmployeeRecordDetail>(() => {
    const ref = this.detailRef();
    return ref ? `${this.basePath}/${ref.recordType}/${ref.id}` : undefined;
  });

  readonly detail = computed(() => this.detailResource.value());
  readonly detailLoading = computed(() => this.detailResource.isLoading());
  readonly detailError = computed(() => this.detailResource.error());

  readonly selectedRecordId = computed(() => this.detailRef()?.id ?? '');
  readonly hasSelectedRecord = computed(() => this.detailRef() !== null);

  openDetail(id: string) {
    this.detailRef.set({ recordType: this.activeTab(), id });
  }

  closeDetail() {
    this.detailRef.set(null);
  }

  setActiveTab(tab: EmployeeRecordTab) {
    if (this.activeTab() === tab) return;

    // Cleared before the tab changes, so the open record never resolves against the new type.
    this.closeDetail();
    this.activeTab.set(tab);
    this.statusFilter.set('all');
    // Sort columns differ per record type; an empty value lets the API pick its own default.
    this.sortOn.set('');
    this.sortDirection.set('desc');
    this.pageIndex.set(0);
  }

  setStatusFilter(status: EmployeeRecordStatusFilter) {
    this.statusFilter.set(status);
    this.pageIndex.set(0);
  }

  setDateMode(mode: EmployeeRecordDateMode) {
    this.dateMode.set(mode);
    this.pageIndex.set(0);
  }

  setEmployeeId(id: string | null) {
    this.employeeId.set(id);
    this.pageIndex.set(0);
  }

  setCompanyId(id: string | null) {
    this.companyId.set(id);
    this.pageIndex.set(0);
  }

  setDateRange(from: Date | null, to: Date | null) {
    this.fromDate.set(from);
    this.toDate.set(to);
    this.pageIndex.set(0);
  }

  setSearchText(text: string | null) {
    this.searchText.set(text);
    this.pageIndex.set(0);
  }

  setPage(index: number) {
    this.pageIndex.set(index);
  }

  setPageSize(size: number) {
    this.pageSize.set(size);
  }

  setSort(sort: string, direction: 'asc' | 'desc') {
    this.sortOn.set(sort);
    this.sortDirection.set(direction);
    this.pageIndex.set(0);
  }

  resetFilters() {
    this.employeeId.set(null);
    this.companyId.set(null);
    this.fromDate.set(null);
    this.toDate.set(null);
    this.searchText.set(null);
    this.dateMode.set('range');
    this.statusFilter.set('all');
    this.pageIndex.set(0);
  }

  refreshActive() {
    this.recordsResource.reload();
  }

  private toIsoDate(value: Date | null): string | null {
    if (!value) return null;
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    return `${value.getFullYear()}-${month}-${day}`;
  }
}
