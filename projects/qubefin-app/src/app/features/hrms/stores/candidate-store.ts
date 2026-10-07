import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { ICandidate, ICandidateFilters, ICandidateList } from '../models/candidate';
@Injectable({
  providedIn: 'root',
})
export class CandidateStore {
  private readonly basePath = `${ApiPaths.HRMS}/candidates`;
  private readonly candidateId = signal<string | undefined>(undefined);

  readonly filters = signal<ICandidateFilters>({
    searchText: '',
    companyId: null,
    applicationDateFrom: null,
    applicationDateTo: null,
    interviewDate: null,
    recommendationStatus: null,
    status: null,
  });
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly sortOn = signal('');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');

  readonly postsResource = httpResource<any[]>(() => `${ApiPaths.HRMS}/posts`);

  readonly posts = computed(() => this.postsResource.value() ?? []);
  readonly postsLoading = computed(() => this.postsResource.isLoading());
  readonly postsError = computed(() => this.postsResource.error());
  readonly candidatesResource = httpResource<{
    candidates: ICandidateList[];
    totalRecords: number;
  }>(() => ({
    url: `${this.basePath}/filter`,
    method: 'POST',
    body: {
      ...this.filters(),
      searchText: this.checkStringOrNull(this.filters().searchText?.trim()),
      sortOn: this.sortOn(),
      sortDirection: this.sortDirection(),
      pageIndex: this.pageIndex(),
      pageSize: this.pageSize(),
    },
  }));
  private checkStringOrNull(value: any): any {
    return value === '' || value === null ? null : value;
  }
  readonly candidates = computed(() => this.candidatesResource.value()?.candidates ?? []);
  readonly totalRecords = computed(() => this.candidatesResource.value()?.totalRecords ?? 0);
  readonly candidatesLoading = computed(() => this.candidatesResource.isLoading());
  readonly candidatesError = computed(() => this.candidatesResource.error());

  readonly candidateResource = httpResource<ICandidate>(() => {
    const id = this.candidateId();

    return id && id !== EMPTY_UUID ? `${this.basePath}/${id}` : undefined;
  });

  readonly candidate = computed(() => {
    const item = this.candidateResource.value();
    return item ? item : undefined;
  });

  readonly candidateLoading = computed(() => this.candidateResource.isLoading());
  readonly candidateError = computed(() => this.candidateResource.error());

  setFilters(filters: ICandidateFilters) {
    this.filters.set(filters);
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
  setCandidateId(id: string | undefined) {
    if (this.candidateId() !== id) {
      this.candidateId.set(id);
    }
  }
  refreshList() {
    this.candidatesResource.reload();
  }
  refreshDetail() {
    this.candidateResource.reload();
  }
}
