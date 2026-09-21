import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { ICandidate, ICandidateDetail, ICandidateList } from '../models/candidate';
@Injectable({
  providedIn: 'root',
})
export class CandidateStore {
  private readonly basePath = `${ApiPaths.HRMS}/candidates`;
  private readonly candidateId = signal<string | undefined>(undefined);

  readonly companyId = signal<string>('');
  readonly searchQuery = signal('');
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly sortOn = signal('interviewDate');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');

  readonly postsResource = httpResource<any[]>(() => `${ApiPaths.HRMS}/posts`);

  readonly posts = computed(() => this.postsResource.value() ?? []);
  readonly postsLoading = computed(() => this.postsResource.isLoading());
  readonly postsError = computed(() => this.postsResource.error());
  // private readonly candidatesResource = httpResource<{
  //   candidates: ICandidateList[];
  //   totalRecords: number;
  // }>(() => {
  //   const search = encodeURIComponent(this.searchQuery());

  //   let url = `${this.basePath}?searchText=${search}&sortOn=${this.sortOn()}&sortDirection=${this.sortDirection()}&pageIndex=${this.pageIndex()}&pageSize=${this.pageSize()}`;

  //   if (this.companyId()) {
  //     url += `&companyId=${this.companyId()}`;
  //   }

  //   return url;
  // });

  readonly candidatesResource = httpResource<{
    candidates: ICandidateList[];
    totalRecords: number;
  }>(() => ({
    url: `${this.basePath}` + '/filter',
    method: 'POST',
    body: {
      companyId: this.checkStringOrNull(this.companyId()),
      searchText: encodeURIComponent(this.searchQuery()),
      // toDate: this.checkStringOrNull(this.toDateQuery()),
      // searchEmployeeId: this.checkStringOrNull(this.searchedEmployeeIdQuery()),
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

  setSearchQuery(query: string) {
    this.searchQuery.set(query);
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
  setCompanyId(id: string) {
    this.companyId.set(id);
  }
  refreshList() {
    this.candidatesResource.reload();
  }
  refreshDetail() {
    this.candidateResource.reload();
  }
}
