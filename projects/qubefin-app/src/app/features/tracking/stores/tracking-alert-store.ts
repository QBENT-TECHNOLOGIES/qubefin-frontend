import { httpResource } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { AlertSearchResponse, AlertSeverity, AlertStatus, AlertType } from '../models/tracking-alert';

@Injectable({ providedIn: 'root' })
export class TrackingAlertStore {
  readonly status = signal<AlertStatus | null>('Open');
  readonly type = signal<AlertType | null>(null);
  readonly severity = signal<AlertSeverity | null>(null);
  readonly branchId = signal<string | null>(null);
  readonly employeeId = signal<string | null>(null);
  readonly fromDate = signal<string | null>(null);
  readonly toDate = signal<string | null>(null);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  readonly searchResource = httpResource<AlertSearchResponse>(() => ({
    url: `${ApiPaths.TRACKING}/alerts/search`,
    method: 'POST',
    body: {
      status: this.status(),
      type: this.type(),
      severity: this.severity(),
      branchId: this.branchId(),
      employeeId: this.employeeId(),
      fromDate: this.fromDate(),
      toDate: this.toDate(),
      pageIndex: this.pageIndex(),
      pageSize: this.pageSize(),
    },
  }));

  readonly alerts = computed(() => this.searchResource.value()?.alerts ?? []);
  readonly totalRecords = computed(() => this.searchResource.value()?.totalRecords ?? 0);
  readonly openByType = computed(() => this.searchResource.value()?.openByType ?? null);
  readonly loading = computed(() => this.searchResource.isLoading());
  readonly error = computed(() => this.searchResource.error());

  setFilter<T>(sig: { set(v: T): void }, value: T) {
    sig.set(value);
    this.pageIndex.set(0);
  }

  refresh() {
    this.searchResource.reload();
  }
}
