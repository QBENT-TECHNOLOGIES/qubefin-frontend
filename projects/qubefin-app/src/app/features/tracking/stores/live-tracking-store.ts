import { httpResource } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { EmployeeRoute, LivePosition, LiveStatus } from '../models/live-position';
import { toDateKey } from '../utils/geo-utils';

@Injectable({ providedIn: 'root' })
export class LiveTrackingStore {
  readonly branchId = signal<string | null>(null);

  readonly positionsResource = httpResource<LivePosition[]>(() => {
    const branchId = this.branchId();
    const params: Record<string, string> = {};
    if (branchId) params['branchId'] = branchId;
    return { url: `${ApiPaths.TRACKING}/live/positions`, params };
  });

  readonly positions = computed(() => this.positionsResource.value() ?? []);
  readonly loading = computed(() => this.positionsResource.isLoading());
  readonly error = computed(() => this.positionsResource.error());

  readonly countsByStatus = computed(() => {
    const counts: Record<LiveStatus, number> = { OnTask: 0, AtBranch: 0, Moving: 0, Idle: 0, GpsOff: 0, Offline: 0, NotPunchedIn: 0, PunchedOut: 0 };
    this.positions().forEach((p) => counts[p.status]++);
    return counts;
  });

  // --- Route playback --------------------------------------------------------------------
  readonly routeEmployeeId = signal<string | null>(null);
  readonly routeDate = signal<string>(toDateKey());

  readonly routeResource = httpResource<EmployeeRoute>(() => {
    const id = this.routeEmployeeId();
    if (!id) return undefined;
    return { url: `${ApiPaths.TRACKING}/employees/${id}/route`, params: { date: this.routeDate() } };
  });

  readonly route = computed(() => this.routeResource.value());
  readonly routeLoading = computed(() => this.routeResource.isLoading());

  refreshPositions() {
    this.positionsResource.reload();
  }

  refreshRoute() {
    if (this.routeEmployeeId()) this.routeResource.reload();
  }
}
