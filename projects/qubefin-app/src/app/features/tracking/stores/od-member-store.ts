import { httpResource } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { OdMemberSearchResponse } from '../models/od-member';
import { SortDirection, TrackingGroup } from '../models/geo';
import { DpdRange } from '../utils/dpd';

/** OD members from the Loan Status Report, with their latest follow-up. */
@Injectable({ providedIn: 'root' })
export class OdMemberStore {
  readonly searchText = signal('');
  readonly branchId = signal<string | null>(null);
  readonly dpdRange = signal<DpdRange | null>(null);
  /** Members mapped to this Credit Officer (filter only). */
  readonly creditOfficerId = signal<string | null>(null);
  /** Members mapped to this group. */
  readonly groupId = signal<string | null>(null);
  readonly onlyUnassigned = signal(false);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly sortOn = signal('dpd');
  readonly sortDirection = signal<SortDirection>('desc');

  readonly searchResource = httpResource<OdMemberSearchResponse>(() => ({
    url: `${ApiPaths.TRACKING}/od-members/search`,
    method: 'POST',
    body: {
      searchText: this.searchText() || null,
      branchId: this.branchId(),
      dpdRange: this.dpdRange(),
      creditOfficerId: this.creditOfficerId(),
      groupId: this.groupId(),
      onlyUnassigned: this.onlyUnassigned(),
      pageIndex: this.pageIndex(),
      pageSize: this.pageSize(),
      sortOn: this.sortOn(),
      sortDirection: this.sortDirection(),
    },
  }));

  /**
   * Group options for the filter, narrowed by the chosen branch and Credit Officer. Loaded only once one of them is
   * chosen (or the user's scope is a single branch), so a whole division's groups are never listed at once.
   */
  readonly groupsEnabled = signal(false);
  private readonly groupsResource = httpResource<TrackingGroup[]>(() => {
    const branchId = this.branchId();
    const coId = this.creditOfficerId();
    if (!branchId && !coId && !this.groupsEnabled()) return undefined;
    const params: Record<string, string> = {};
    if (branchId) params['branchId'] = branchId;
    if (coId) params['creditOfficerId'] = coId;
    return { url: `${ApiPaths.TRACKING}/groups`, params };
  });
  readonly groups = computed(() => (this.groupsResource.hasValue() ? this.groupsResource.value() : []));
  readonly groupsLoading = computed(() => this.groupsResource.isLoading());

  readonly members = computed(() => this.searchResource.value()?.members ?? []);
  readonly totalRecords = computed(() => this.searchResource.value()?.totalRecords ?? 0);
  readonly totalOverdueAmount = computed(() => this.searchResource.value()?.totalOverdueAmount ?? 0);
  readonly loading = computed(() => this.searchResource.isLoading());
  readonly error = computed(() => this.searchResource.error());

  setFilter<T>(sig: { set(v: T): void }, value: T) {
    sig.set(value);
    this.pageIndex.set(0);
  }

  /** Branch → Credit Officer → group: a narrower choice drops a wider-level pick that no longer fits. */
  setBranch(branchId: string | null, coBranchIds: (coId: string) => string[] | undefined) {
    this.branchId.set(branchId);
    const co = this.creditOfficerId();
    if (branchId && co && !(coBranchIds(co) ?? []).includes(branchId)) this.creditOfficerId.set(null);
    this.groupId.set(null);
    this.pageIndex.set(0);
  }

  setCreditOfficer(coId: string | null) {
    this.creditOfficerId.set(coId);
    this.groupId.set(null);
    this.pageIndex.set(0);
  }

  refresh() {
    this.searchResource.reload();
  }
}
