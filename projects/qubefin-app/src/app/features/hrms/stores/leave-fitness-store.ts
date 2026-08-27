import { httpResource } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { SessionService } from '../../../services/session.service';
import { ILeaveFitnessItem, ILeaveFitnessListItem } from '../models/leave-fitness';
import { LeaveFitnessService } from '../services/leave-fitness-service';

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

  readonly listData = computed(() =>
    (this.listResource.value() ?? []).map((item) => ({
      ...item,
      fromDate: item.fromDate ? new Date(item.fromDate) : null,
      toDate: item.toDate ? new Date(item.toDate) : null,
    })),
  );
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
