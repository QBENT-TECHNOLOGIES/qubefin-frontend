import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import {
  IMemberPersonalInfo,
  IMembersBySearchResult,
  KycDocument,
  Utility,
} from '../models/member-detail';

@Injectable({
  providedIn: 'root',
})
export class MemberStore {
  private readonly memberComponentId = signal<string | undefined>(undefined);

  // --- Pagination & Filtering State ---
  readonly searchQuery = signal<string>('');
  readonly branchCode = signal<number | null>(null);
  readonly pageIndex = signal<number>(0);
  readonly pageSize = signal<number>(10);
  readonly sortOn = signal<string>('name');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');

  readonly memberListComponentsResource = httpResource<{
    members: IMembersBySearchResult[];
    totalRecords: number;
  }>(() => ({
    url: `${ApiPaths.GLOBAL}/members/search`,
    method: 'POST',
    body: {
      searchText: this.searchQuery() || null,
      branchCode: this.branchCode(),
      sortOn: this.sortOn(),
      sortDirection: this.sortDirection(),
      pageIndex: this.pageIndex(),
      pageSize: this.pageSize(),
    },
  }));

  readonly memberListComponents = computed(() =>
    this.memberListComponentsResource.hasValue()
      ? (this.memberListComponentsResource.value()?.members ?? [])
      : [],
  );

  readonly totalRecords = computed(() =>
    this.memberListComponentsResource.hasValue()
      ? (this.memberListComponentsResource.value()?.totalRecords ?? 0)
      : 0,
  );

  readonly loading = computed(() => this.memberListComponentsResource.isLoading());
  readonly error = computed(() => this.memberListComponentsResource.error());

  // --- Detail Resource ---
  // --- Detail Resource ---
  private readonly memberInfoComponentResource = httpResource<IMemberPersonalInfo>(() => {
    const id = this.memberComponentId();
    if (!id || id === EMPTY_UUID) return undefined;
    return `${ApiPaths.GLOBAL}/members/personal-details/${id}`;
  });

  readonly memberInfoComponent = computed(() =>
    this.memberInfoComponentResource.hasValue()
      ? (this.memberInfoComponentResource.value() ?? undefined)
      : undefined,
  );

  // --- Utilities & KYC ---
  private readonly utilityResource = httpResource<Utility[]>(() => {
    return `${ApiPaths.GLOBAL}/utilities`;
  });
  readonly utilityComponent = computed<Utility[]>(() =>
    this.utilityResource.hasValue() ? (this.utilityResource.value() ?? []) : [],
  );

  private readonly kycResource = httpResource<KycDocument[]>(() => {
    return `${ApiPaths.GLOBAL}/kyc-documents`;
  });
  readonly kycComponent = computed<KycDocument[]>(() =>
    this.kycResource.hasValue() ? (this.kycResource.value() ?? []) : [],
  );

  // --- State Setters ---
  setSearchQuery(query: string) {
    this.searchQuery.set(query);
    this.pageIndex.set(0);
  }

  setBranchCode(branchCode: number | null) {
    this.branchCode.set(branchCode);
    this.pageIndex.set(0);
  }

  setPage(index: number) {
    this.pageIndex.set(index);
  }

  setPageSize(size: number) {
    this.pageSize.set(size);
  }

  setSort(field: string, direction: 'asc' | 'desc') {
    this.sortOn.set(field);
    this.sortDirection.set(direction);
  }

  setMemberComponentId(id: string | undefined) {
    if (this.memberComponentId() === id) return;
    this.memberComponentId.set(id);
  }

  refreshList() {
    this.memberListComponentsResource.reload();
  }

  refreshDetail() {
    this.memberInfoComponentResource.reload();
  }
}
