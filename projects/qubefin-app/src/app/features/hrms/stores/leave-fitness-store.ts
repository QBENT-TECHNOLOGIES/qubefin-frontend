import { httpResource } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { SessionService } from '../../../services/session.service';
import { ILeaveFitnessItem, ILeaveFitnessListItem } from '../models/leave-fitness';
import { LeaveFitnessService } from '../services/leave-fitness-service';

function startOfDay(date: Date | null): Date | null {
  if (!date) return null;
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date | null): Date | null {
  if (!date) return null;
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

/**
 * A leave counts as in range when its own period overlaps the filter period. A row with
 * no dates at all is kept rather than silently dropped.
 */
function overlapsRange(
  itemFrom: Date | null,
  itemTo: Date | null,
  from: Date | null,
  to: Date | null,
): boolean {
  const start = itemFrom ?? itemTo;
  const end = itemTo ?? itemFrom;

  if (!start || !end) return true;
  if (from && end < from) return false;
  if (to && start > to) return false;

  return true;
}

@Injectable({
  providedIn: 'root',
})
export class LeaveFitnessStore {
  private readonly sessionService = inject(SessionService);
  private readonly service = inject(LeaveFitnessService);

  readonly selectedId = signal<string | undefined>(undefined);

  readonly listResource = httpResource<ILeaveFitnessListItem[]>(() => ({
    url: `${ApiPaths.HRMS}/leaves/fitness-approval`,
    method: 'GET',
  }));

  // The fitness-approval endpoint takes no parameters, so unlike the other approval
  // queues this one is filtered client side over the loaded list.
  readonly employeeNameQuery = signal('');
  readonly fromDateQuery = signal<Date | null>(null);
  readonly toDateQuery = signal<Date | null>(null);

  private readonly allListData = computed(() =>
    (this.listResource.value() ?? []).map((item) => ({
      ...item,
      fromDate: item.fromDate ? new Date(item.fromDate) : null,
      toDate: item.toDate ? new Date(item.toDate) : null,
    })),
  );

  readonly listData = computed(() => {
    const name = this.employeeNameQuery().trim().toLowerCase();
    const from = startOfDay(this.fromDateQuery());
    const to = endOfDay(this.toDateQuery());

    if (!name && !from && !to) {
      return this.allListData();
    }

    return this.allListData().filter(
      (item) =>
        (!name || (item.employeeName ?? '').toLowerCase().includes(name)) &&
        overlapsRange(item.fromDate, item.toDate, from, to),
    );
  });

  readonly loading = computed(() => this.listResource.isLoading());
  readonly error = computed(() => this.listResource.error());

  private readonly detailBasePath = `${ApiPaths.HRMS}/leaves/fitnes-upload`;

  readonly detailResource = httpResource<ILeaveFitnessItem>(() => {
    const id = this.selectedId();
    return id && id !== EMPTY_UUID ? `${this.detailBasePath}/${id}` : undefined;
  });

  readonly detailData = computed(() => {
    const item = this.detailResource.value();
    if (!item) return undefined;
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
  });

  readonly detailLoading = computed(() => this.detailResource.isLoading());
  readonly detailError = computed(() => this.detailResource.error());

  setSelectedId(id: string | undefined) {
    if (this.selectedId() !== id) {
      this.selectedId.set(id);
    }
  }

  setEmployeeNameQuery(name: string) {
    this.employeeNameQuery.set(name);
  }

  setDateRange(from: Date | null, to: Date | null) {
    this.fromDateQuery.set(from);
    this.toDateQuery.set(to);
  }

  refreshList() {
    this.listResource.reload();
  }

  refreshDetail() {
    this.detailResource.reload();
  }

  action(id: string) {
    return this.service.fitnessAction(id);
  }
}
