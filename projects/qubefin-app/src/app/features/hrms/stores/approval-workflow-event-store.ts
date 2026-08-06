import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { IApprovalWorkflowEvent } from '../models/approval-workflow-event';

@Injectable({
  providedIn: 'root',
})
export class ApprovalWorkflowEventStore {
  private readonly basePath = `${ApiPaths.HRMS}/approval-workflow-events`;
  private readonly approvalWorkflowEventId = signal<string | undefined>(undefined);

  private readonly approvalWorkflowEventsResource = httpResource<IApprovalWorkflowEvent[]>(
    () => this.basePath,
  );

  readonly approvalWorkflowEvents = computed(
    () => this.approvalWorkflowEventsResource.value() ?? [],
  );
  readonly loading = computed(() => this.approvalWorkflowEventsResource.isLoading());
  readonly error = computed(() => this.approvalWorkflowEventsResource.error());

  private readonly approvalWorkflowEventResource = httpResource<IApprovalWorkflowEvent>(() => {
    const id = this.approvalWorkflowEventId();
    return id && id !== EMPTY_UUID ? `${this.basePath}/${id}` : undefined;
  });

  readonly approvalWorkflowEvent = computed(
    () => this.approvalWorkflowEventResource.value() ?? undefined,
  );
  readonly approvalWorkflowEventLoading = computed(() =>
    this.approvalWorkflowEventResource.isLoading(),
  );
  readonly approvalWorkflowEventError = computed(() => this.approvalWorkflowEventResource.error());

  setApprovalWorkflowEventId(id: string | undefined) {
    if (this.approvalWorkflowEventId() !== id) {
      this.approvalWorkflowEventId.set(id);
    }
  }

  refreshList() {
    this.approvalWorkflowEventsResource.reload();
  }

  refreshDetail() {
    this.approvalWorkflowEventResource.reload();
  }
}
