import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import {
    IApprovalWorkflowEvent,
    IApprovalWorkflowEventGroupItem,
} from '../models/approval-workflow-event';

@Injectable({
    providedIn: 'root',
})
export class ApprovalWorkflowEventStore {
    private readonly workflowEventPath = `${ApiPaths.HRMS}/approval-workflow-events`;
    private readonly approvalWorkflowEventId = signal<string | undefined>(undefined);

    // private readonly approvalWorkflowResource = httpResource<IApprovalWorkflowResponse>(
    //     () => this.workflowEventPath,
    // );

    // readonly approvalWorkflowEvents = computed(
    //     () => this.approvalWorkflowResource.value() ?? { categories: [] },
    // );
    // readonly loading = computed(() => this.approvalWorkflowResource.isLoading());
    // readonly error = computed(() => this.approvalWorkflowResource.error());

    private readonly approvalWorkflowTreeResource = httpResource<IApprovalWorkflowEventGroupItem[]>(
        () => `${this.workflowEventPath}/tree`,
    );

    readonly approvalWorkflowEvents = computed(
        () => this.approvalWorkflowTreeResource.value() ?? [],
    );
    // readonly categories = computed(() => this.approvalWorkflowTree().categories);
    readonly loadingTree = computed(() => this.approvalWorkflowTreeResource.isLoading());
    readonly errorTree = computed(() => this.approvalWorkflowTreeResource.error());

    private readonly approvalWorkflowEventResource = httpResource<IApprovalWorkflowEvent>(() => {
        const id = this.approvalWorkflowEventId();
        return id && id !== EMPTY_UUID ? `${this.workflowEventPath}/${id}` : undefined;
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
        // this.approvalWorkflowResource.reload();
    }

    refreshDetail() {
        this.approvalWorkflowEventResource.reload();
    }
}
