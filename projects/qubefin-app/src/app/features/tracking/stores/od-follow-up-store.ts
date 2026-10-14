import { httpResource } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { OverdueCustomerSearchResponse } from '../models/overdue-customer';
import { SortDirection } from '../models/geo';

/** Overdue customers from the Loan Status Report, with their latest follow-up. */
@Injectable({ providedIn: 'root' })
export class OdFollowUpStore {
  readonly searchText = signal('');
  readonly branchId = signal<string | null>(null);
  readonly minDpd = signal<number | null>(null);
  readonly onlyUnassigned = signal(false);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly sortOn = signal('dpd');
  readonly sortDirection = signal<SortDirection>('desc');

  readonly searchResource = httpResource<OverdueCustomerSearchResponse>(() => ({
    url: `${ApiPaths.TRACKING}/overdue-customers/search`,
    method: 'POST',
    body: {
      searchText: this.searchText() || null,
      branchId: this.branchId(),
      minDpd: this.minDpd(),
      onlyUnassigned: this.onlyUnassigned(),
      pageIndex: this.pageIndex(),
      pageSize: this.pageSize(),
      sortOn: this.sortOn(),
      sortDirection: this.sortDirection(),
    },
  }));

  readonly customers = computed(() => this.searchResource.value()?.customers ?? []);
  readonly totalRecords = computed(() => this.searchResource.value()?.totalRecords ?? 0);
  readonly totalOverdueAmount = computed(() => this.searchResource.value()?.totalOverdueAmount ?? 0);
  readonly loading = computed(() => this.searchResource.isLoading());
  readonly error = computed(() => this.searchResource.error());

  setFilter<T>(sig: { set(v: T): void }, value: T) {
    sig.set(value);
    this.pageIndex.set(0);
  }

  refresh() {
    this.searchResource.reload();
  }
}
