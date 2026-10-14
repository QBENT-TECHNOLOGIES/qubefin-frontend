import { httpResource } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import {
  TaskHistoryEntry,
  TaskSearchResponse,
  TaskSource,
  TaskStatus,
  TaskType,
  TrackingTask,
} from '../models/tracking-task';
import { SortDirection } from '../models/geo';
import { toDateKey } from '../utils/geo-utils';

@Injectable({ providedIn: 'root' })
export class TrackingTaskStore {
  private readonly basePath = `${ApiPaths.TRACKING}/tasks`;

  // --- Filters / paging ------------------------------------------------------------------
  readonly searchText = signal('');
  readonly status = signal<TaskStatus | null>(null);
  readonly type = signal<TaskType | null>(null);
  readonly source = signal<TaskSource | null>(null);
  readonly branchId = signal<string | null>(null);
  readonly assigneeId = signal<string | null>(null);
  readonly fromDate = signal<string | null>(toDateKey());
  readonly toDate = signal<string | null>(toDateKey());
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly sortOn = signal('dueBy');
  readonly sortDirection = signal<SortDirection>('asc');

  readonly searchResource = httpResource<TaskSearchResponse>(() => ({
    url: `${this.basePath}/search`,
    method: 'POST',
    body: {
      searchText: this.searchText() || null,
      status: this.status(),
      type: this.type(),
      source: this.source(),
      branchId: this.branchId(),
      assigneeId: this.assigneeId(),
      fromDate: this.fromDate(),
      toDate: this.toDate(),
      pageIndex: this.pageIndex(),
      pageSize: this.pageSize(),
      sortOn: this.sortOn(),
      sortDirection: this.sortDirection(),
    },
  }));

  readonly tasks = computed(() => this.searchResource.value()?.tasks ?? []);
  readonly totalRecords = computed(() => this.searchResource.value()?.totalRecords ?? 0);
  readonly summary = computed(
    () =>
      this.searchResource.value()?.summary ?? { total: 0, assigned: 0, inProgress: 0, completed: 0, missed: 0, late: 0 },
  );
  readonly loading = computed(() => this.searchResource.isLoading());
  readonly error = computed(() => this.searchResource.error());

  // --- Selected task ---------------------------------------------------------------------
  private readonly taskId = signal<string | undefined>(undefined);

  private readonly taskResource = httpResource<TrackingTask>(() => {
    const id = this.taskId();
    return id && id !== EMPTY_UUID ? `${this.basePath}/${id}` : undefined;
  });
  private readonly historyResource = httpResource<TaskHistoryEntry[]>(() => {
    const id = this.taskId();
    return id && id !== EMPTY_UUID ? `${this.basePath}/${id}/history` : undefined;
  });

  readonly task = computed(() => this.taskResource.value());
  readonly taskLoading = computed(() => this.taskResource.isLoading());
  readonly taskError = computed(() => this.taskResource.error());
  readonly history = computed(() => this.historyResource.value() ?? []);
  readonly historyLoading = computed(() => this.historyResource.isLoading());

  setTaskId(id: string | undefined) {
    if (this.taskId() !== id) this.taskId.set(id);
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
    this.taskResource.reload();
    this.historyResource.reload();
  }
}
