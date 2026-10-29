import { httpResource } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { Job, JobHistoryEntry, JobSearchRequest, JobSearchResponse, JobStatus } from '../models/job';
import { SortDirection } from '../models/geo';
import { DpdRange } from '../utils/dpd';

const EMPTY_SUMMARY = { total: 0, unassigned: 0, assigned: 0, inProgress: 0, delayed: 0, completed: 0 };

@Injectable({ providedIn: 'root' })
export class JobStore {
  private readonly basePath = `${ApiPaths.TRACKING}/jobs`;

  // --- Filters / paging ------------------------------------------------------------------
  readonly searchText = signal('');
  readonly status = signal<JobStatus | null>(null);
  readonly branchId = signal<string | null>(null);
  readonly assigneeId = signal<string | null>(null);
  readonly dueFrom = signal<string | null>(null);
  readonly dueTo = signal<string | null>(null);
  /** Jobs with OD member tasks in this days-past-due range. */
  readonly dpdRange = signal<DpdRange | null>(null);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly sortOn = signal<JobSearchRequest['sortOn']>('completeBy');
  readonly sortDirection = signal<SortDirection>('asc');

  readonly searchResource = httpResource<JobSearchResponse>(() => ({
    url: `${this.basePath}/search`,
    method: 'POST',
    body: {
      searchText: this.searchText() || null,
      status: this.status(),
      openOnly: false,
      branchId: this.branchId(),
      assigneeId: this.assigneeId(),
      dueFrom: this.dueFrom(),
      dueTo: this.dueTo(),
      dpdRange: this.dpdRange(),
      pageIndex: this.pageIndex(),
      pageSize: this.pageSize(),
      sortOn: this.sortOn(),
      sortDirection: this.sortDirection(),
    } satisfies JobSearchRequest,
  }));

  readonly jobs = computed(() => this.searchResource.value()?.jobs ?? []);
  readonly totalRecords = computed(() => this.searchResource.value()?.totalRecords ?? 0);
  readonly summary = computed(() => this.searchResource.value()?.summary ?? EMPTY_SUMMARY);
  readonly loading = computed(() => this.searchResource.isLoading());
  readonly error = computed(() => this.searchResource.error());

  // --- Selected job ----------------------------------------------------------------------
  private readonly jobId = signal<string | undefined>(undefined);

  private readonly jobResource = httpResource<Job>(() => {
    const id = this.jobId();
    return id && id !== EMPTY_UUID ? `${this.basePath}/${id}` : undefined;
  });
  private readonly historyResource = httpResource<JobHistoryEntry[]>(() => {
    const id = this.jobId();
    return id && id !== EMPTY_UUID ? `${this.basePath}/${id}/history` : undefined;
  });

  // hasValue(): a job outside the user's scope comes back 404, and value() would throw while in error.
  readonly job = computed(() => (this.jobResource.hasValue() ? this.jobResource.value() : undefined));
  readonly jobLoading = computed(() => this.jobResource.isLoading());
  readonly jobError = computed(() => this.jobResource.error());
  readonly history = computed(() => (this.historyResource.hasValue() ? this.historyResource.value() : []));

  setJobId(id: string | undefined) {
    if (this.jobId() !== id) this.jobId.set(id);
  }

  /** Any filter change goes back to page 1. */
  setFilter<T>(sig: { set(v: T): void }, value: T) {
    sig.set(value);
    this.pageIndex.set(0);
  }

  refreshList() {
    this.searchResource.reload();
  }

  refreshDetail() {
    this.jobResource.reload();
    this.historyResource.reload();
  }
}
