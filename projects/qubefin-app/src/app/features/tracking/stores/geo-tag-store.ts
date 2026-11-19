import { httpResource } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { PagedResult, SortDirection } from '../models/geo';
import { GeoTag, GeoTagKind, GeoTagSearchRequest, GeoTagSortOn } from '../models/geo-tag';

/** Geo Tags page (E1, `POST geo-tags/search`, paged since 19 Nov 2026). */
@Injectable({ providedIn: 'root' })
export class GeoTagStore {
  readonly kind = signal<GeoTagKind>('Branch');
  readonly searchText = signal('');
  /** Branch filter; sent as `organizationUnitId` (E1). */
  readonly branchId = signal<string | null>(null);
  readonly onlyUntagged = signal(false);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(25);
  readonly sortOn = signal<GeoTagSortOn>('name');
  readonly sortDirection = signal<SortDirection>('asc');

  readonly tagsResource = httpResource<PagedResult<GeoTag>>(() => ({
    url: `${ApiPaths.TRACKING}/geo-tags/search`,
    method: 'POST',
    body: {
      kind: this.kind(),
      searchText: this.searchText().trim() || null,
      organizationUnitId: this.branchId(),
      onlyUntagged: this.onlyUntagged(),
      sortOn: this.sortOn(),
      sortDirection: this.sortDirection(),
      pageIndex: this.pageIndex(),
      pageSize: this.pageSize(),
    } satisfies GeoTagSearchRequest,
  }));

  /** The rows of the current page. */
  readonly tags = computed(() => (this.tagsResource.hasValue() ? (this.tagsResource.value().items ?? []) : []));
  /** Every row matching the filters (all pages). */
  readonly totalRecords = computed(() => (this.tagsResource.hasValue() ? (this.tagsResource.value().totalRecords ?? 0) : 0));
  readonly loading = computed(() => this.tagsResource.isLoading());
  readonly error = computed(() => this.tagsResource.error());
  /** Rows on this page with no location yet. */
  readonly untaggedCount = computed(() => this.tags().filter((t) => !t.location).length);

  /** Changing a filter goes back to the first page. */
  setFilter<T>(sig: { set(v: T): void }, value: T) {
    sig.set(value);
    this.pageIndex.set(0);
  }

  setPage(pageIndex: number, pageSize: number) {
    this.pageSize.set(pageSize);
    this.pageIndex.set(pageIndex);
  }

  refresh() {
    this.tagsResource.reload();
  }
}
