import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { IGroupAddInfo, IGroupDetail, IGroupListItem } from '../models/group';

@Injectable({
  providedIn: 'root',
})
export class GroupStore {
  private readonly basePath = `${ApiPaths.GLOBAL}/groups`;

  // ===========================
  // List
  // ===========================
  readonly searchQuery = signal('');
  readonly statusFilter = signal('');
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly sortOn = signal('createdOn');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');

  readonly groupsResource = httpResource<{ results: IGroupListItem[]; totalRecords: number }>(() => ({
    url: `${this.basePath}/search`,
    method: 'POST',
    body: {
      searchText: this.searchQuery(),
      status: this.statusFilter(),
      sortOn: this.sortOn(),
      sortDirection: this.sortDirection(),
      pageIndex: this.pageIndex(),
      pageSize: this.pageSize(),
    },
  }));

  readonly groups = computed(() => this.groupsResource.value()?.results ?? []);
  readonly totalRecords = computed(() => this.groupsResource.value()?.totalRecords ?? 0);
  readonly loading = computed(() => this.groupsResource.isLoading());
  readonly error = computed(() => this.groupsResource.error());

  // ===========================
  // Add Group: who can add, and the choices
  // ===========================
  readonly addInfoResource = httpResource<IGroupAddInfo>(() => `${this.basePath}/add-info`);
  readonly addInfo = computed(() => this.addInfoResource.value());
  readonly canAdd = computed(() => this.addInfoResource.value()?.canAdd ?? false);

  // ===========================
  // Detail
  // ===========================
  private readonly groupId = signal<string | undefined>(undefined);

  readonly groupResource = httpResource<IGroupDetail>(() => {
    const id = this.groupId();
    return id && id !== EMPTY_UUID ? `${this.basePath}/${id}` : undefined;
  });
  readonly group = computed(() => this.groupResource.value());
  readonly groupLoading = computed(() => this.groupResource.isLoading());
  readonly groupError = computed(() => this.groupResource.error());

  // ===========================
  // Actions
  // ===========================
  setSearchQuery(query: string) {
    this.searchQuery.set(query);
    this.pageIndex.set(0);
  }

  setStatus(status: string) {
    this.statusFilter.set(status);
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

  setGroupId(id: string | undefined) {
    if (this.groupId() !== id) {
      this.groupId.set(id);
    }
  }

  refreshList() {
    this.groupsResource.reload();
    this.addInfoResource.reload();
  }

  refreshDetail() {
    this.groupResource.reload();
  }
}
