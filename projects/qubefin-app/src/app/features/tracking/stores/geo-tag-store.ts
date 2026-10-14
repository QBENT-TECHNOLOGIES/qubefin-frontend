import { httpResource } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { GeoTag, GeoTagKind } from '../models/geo-tag';

@Injectable({ providedIn: 'root' })
export class GeoTagStore {
  readonly kind = signal<GeoTagKind>('Branch');
  readonly searchText = signal('');
  readonly branchId = signal<string | null>(null);
  readonly onlyUntagged = signal(false);

  readonly tagsResource = httpResource<GeoTag[]>(() => {
    const params: Record<string, string> = { kind: this.kind(), onlyUntagged: String(this.onlyUntagged()) };
    const text = this.searchText().trim();
    const branchId = this.branchId();
    if (text) params['searchText'] = text;
    if (branchId) params['branchId'] = branchId;
    return { url: `${ApiPaths.TRACKING}/geo-tags`, params };
  });

  readonly tags = computed(() => this.tagsResource.value() ?? []);
  readonly loading = computed(() => this.tagsResource.isLoading());
  readonly error = computed(() => this.tagsResource.error());
  readonly untaggedCount = computed(() => this.tags().filter((t) => !t.location).length);

  refresh() {
    this.tagsResource.reload();
  }
}
