import { httpResource } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { ILeavePrayerItem, ILeavePrayerListItem } from '../models/leave-prayer';
import { ILeaveTypeBalance } from '../models/leave-request';
import { SessionService } from '../../../services/session.service';

@Injectable({
  providedIn: 'root',
})
export class LeavePrayerStore {
  private readonly basePath = `${ApiPaths.HRMS}/leave/prayers`;

  private readonly leavePrayerId = signal<string | undefined>(undefined);
  private readonly sessionService = inject(SessionService);
  readonly yearQuery = signal<number | null>(new Date().getFullYear());
  private readonly employeeId = this.sessionService.employeeId;
  readonly leaveTypeBalancesResource = httpResource<ILeaveTypeBalance[]>(
    () => `${ApiPaths.HRMS}/leave-types/prayer-balances`,
  );

  readonly leaveTypeBalances = computed(
    () => this.leaveTypeBalancesResource.value()?.filter((m) => m.leaveBalance >= 1) ?? [],
  );
  readonly leaveTypeBalancesLoading = computed(() => this.leaveTypeBalancesResource.isLoading());
  readonly leavePrayersResource = httpResource<ILeavePrayerListItem[]>(() => {
    const year = this.yearQuery();
    return `${this.basePath}/by-year/${year}`;
  });

  readonly leavePrayers = computed(() => this.leavePrayersResource.value() ?? []);

  readonly loading = computed(() => this.leavePrayersResource.isLoading());
  readonly error = computed(() => this.leavePrayersResource.error());

  readonly leavePrayerResource = httpResource<ILeavePrayerItem>(() => {
    const id = this.leavePrayerId();
    return id && id !== EMPTY_UUID ? `${this.basePath}/${id}/${this.employeeId}` : undefined;
  });

  readonly leavePrayer = computed(() => this.leavePrayerResource.value());

  readonly leavePrayerLoading = computed(() => this.leavePrayerResource.isLoading());
  readonly leavePrayerError = computed(() => this.leavePrayerResource.error());
  setYearQuery(year: number) {
    this.yearQuery.set(year);
  }

  refreshList() {
    this.leavePrayersResource.reload();
  }

  setLeaveRequestId(id: string | undefined) {
    if (this.leavePrayerId() !== id) {
      this.leavePrayerId.set(id);
    }
  }

  refreshDetail() {
    this.leavePrayerResource.reload();
  }
}
