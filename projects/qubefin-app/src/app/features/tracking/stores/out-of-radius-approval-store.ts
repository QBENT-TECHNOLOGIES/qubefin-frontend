import { httpResource } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { ApprovalStatus, OutOfRadiusRequest } from '../models/approval-request';

@Injectable({ providedIn: 'root' })
export class OutOfRadiusApprovalStore {
  readonly status = signal<ApprovalStatus | null>('Pending');

  readonly requestsResource = httpResource<OutOfRadiusRequest[]>(() => {
    const status = this.status();
    const params: Record<string, string> = {};
    if (status) params['status'] = status;
    return { url: `${ApiPaths.TRACKING}/approvals`, params };
  });

  readonly requests = computed(() => this.requestsResource.value() ?? []);
  readonly loading = computed(() => this.requestsResource.isLoading());
  readonly error = computed(() => this.requestsResource.error());

  refresh() {
    this.requestsResource.reload();
  }
}
