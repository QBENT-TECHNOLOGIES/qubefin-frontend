import { httpResource } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import {
  ILeaveRequestItem,
  ILeaveRequestListItem,
  ILeaveTypeBalance,
} from '../models/leave-request';
import { SessionService } from '../../../services/session.service';

@Injectable({
  providedIn: 'root',
})
export class LeaveRequestStore {
  private readonly basePath = `${ApiPaths.HRMS}/leaves/requests`;

  private readonly leaveRequestId = signal<string | undefined>(undefined);
  private readonly sessionService = inject(SessionService);

  readonly yearQuery = signal<number | null>(new Date().getFullYear());

  readonly leaveTypeBalancesResource = httpResource<ILeaveTypeBalance[]>(
    () => `${ApiPaths.HRMS}/leave-types/balances`,
  );

  readonly leaveTypeBalances = computed(
    () => this.leaveTypeBalancesResource.value()?.filter((m) => m.leaveBalance >= 1) ?? [],
  );
  readonly leaveTypeBalancesLoading = computed(() => this.leaveTypeBalancesResource.isLoading());

  readonly leaveRequestsResource = httpResource<ILeaveRequestListItem[]>(() => {
    const year = this.yearQuery();
    return `${this.basePath}/by-year/${year}`;
  });

  readonly leaveRequests = computed(
    () => this.leaveRequestsResource.value()?.map((item) => this.normalizeListItem(item)) ?? [],
  );

  readonly loading = computed(() => this.leaveRequestsResource.isLoading());
  readonly error = computed(() => this.leaveRequestsResource.error());

  readonly leaveRequestResource = httpResource<ILeaveRequestItem>(() => {
    const id = this.leaveRequestId();
    const employeeId = this.sessionService.employeeId;
    return id && id !== EMPTY_UUID && employeeId
      ? `${this.basePath}/${id}/${employeeId}`
      : undefined;
  });

  readonly leaveRequest = computed(() => {
    const item = this.leaveRequestResource.value();
    return item ? this.normalizeItem(item) : undefined;
  });

  readonly leaveRequestLoading = computed(() => this.leaveRequestResource.isLoading());
  readonly leaveRequestError = computed(() => this.leaveRequestResource.error());

  setYearQuery(year: number) {
    this.yearQuery.set(year);
  }

  refreshList() {
    this.leaveRequestsResource.reload();
  }

  setLeaveRequestId(id: string | undefined) {
    if (this.leaveRequestId() !== id) {
      this.leaveRequestId.set(id);
    }
  }

  refreshDetail() {
    this.leaveRequestResource.reload();
  }

  private normalizeListItem(item: ILeaveRequestListItem): ILeaveRequestListItem {
    return {
      ...item,
      fromDate: item.fromDate ? new Date(item.fromDate) : null,
      toDate: item.toDate ? new Date(item.toDate) : null,
    };
  }

  private normalizeItem(item: ILeaveRequestItem): ILeaveRequestItem {
    return {
      ...item,
      fromDate: item.fromDate ? new Date(item.fromDate) : null,
      toDate: item.toDate ? new Date(item.toDate) : null,
      events: item.events
        ? item.events.map((h) => ({
            ...h,
            eventDate: h.eventDate ? new Date(h.eventDate) : '',
          }))
        : [],
    };
  }
}
