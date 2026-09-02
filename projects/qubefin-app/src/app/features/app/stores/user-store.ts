import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { User, UserSearchResult } from '../models/user';

@Injectable({
  providedIn: 'root',
})
export class UserStore {
  // Internal State
  private userState = signal({
    searchText: '',
    pageIndex: 0,
    pageSize: 10,
    sortOn: 'name',
    sortDirection: 'asc',
    userId: EMPTY_UUID,
  });

  // Selectors
  readonly searchParams = computed(() => {
    const searchState = this.userState();
    return {
      searchText: searchState.searchText,
      pageIndex: searchState.pageIndex,
      pageSize: searchState.pageSize,
      sortOn: searchState.sortOn,
      sortDirection: searchState.sortDirection,
    };
  });

  readonly hasUserId = computed(() => this.userState().userId !== EMPTY_UUID);
  //private readonly userId = signal<string | undefined>(undefined);

  // All Users
  usersResource = httpResource<User[]>(() => `${ApiPaths.APP}/users`);

  readonly users = computed(() => {
    if (this.usersResource.error()) return [];
    return this.usersResource.value() ?? [];
  });
  readonly loading = computed(() => this.usersResource.isLoading());
  readonly error = computed(() => this.usersResource.error());

  // Search Users
  usersSearchResource = httpResource<UserSearchResult>(() => {
    const params = new URLSearchParams(this.searchParams() as any);
    return `${ApiPaths.APP}/users/search?${params.toString()}`;
  });

  readonly searchedUsers = computed(() => {
    if (this.usersSearchResource.error()) {
      return { totalCount: 0, users: [] };
    }
    return this.usersSearchResource.value() ?? { totalCount: 0, users: [] };
  });
  readonly searchedLoading = computed(() => this.usersSearchResource.isLoading());
  readonly searchedError = computed(() => this.usersSearchResource.error());

  // Single User
  private readonly userResource = httpResource<User>(() =>
    this.hasUserId() ? `${ApiPaths.APP}/users/${this.userState().userId}` : undefined,
  );

  readonly user = computed(() => {
    if (this.userResource.error()) return undefined;
    return this.userResource.value() ?? undefined;
  });
  readonly userLoading = computed(() => this.userResource.isLoading());
  readonly userError = computed(() => this.userResource.error());

  // Actions
  updateStateParams(params: Partial<ReturnType<typeof this.userState>>) {
    this.userState.update((current) => ({ ...current, ...params }));
  }

  setSort(sortOn: string, sortDirection: string) {
    this.updateStateParams({ sortOn, sortDirection });
  }

  setSearchQuery(searchText: string) {
    this.updateStateParams({ searchText: searchText ?? '' });
  }

  setPagination = (page: number, count: number): void =>
    this.updateStateParams({ pageIndex: page, pageSize: count });

  setPageIndex = (page: number): void => this.updateStateParams({ pageIndex: page });

  setPageSize = (itemCount: number): void => this.updateStateParams({ pageSize: itemCount });

  setUserId(id: string | undefined) {
    this.updateStateParams({ userId: id });
  }
}
