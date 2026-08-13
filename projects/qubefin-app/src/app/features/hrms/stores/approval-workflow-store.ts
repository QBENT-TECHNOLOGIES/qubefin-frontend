import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { IApprovalWorkflow } from '../models/approval-workflow';

@Injectable({
    providedIn: 'root',
})
export class ApprovalWorkflowStore {
    private readonly workflowPath = `${ApiPaths.HRMS}/approval-workflows`;
    private readonly approvalWorkflowId = signal<string | undefined>(undefined);

    private readonly approvalWorkflowsResource = httpResource<IApprovalWorkflow[]>(
        () => this.workflowPath,
    );

    readonly approvalWorkflows = computed(
        () => this.approvalWorkflowsResource.value() ?? [],
    );
    readonly loading = computed(() => this.approvalWorkflowsResource.isLoading());
    readonly error = computed(() => this.approvalWorkflowsResource.error());


    private readonly approvalWorkflowResource = httpResource<IApprovalWorkflow>(() => {
        const id = this.approvalWorkflowId();
        return id && id !== EMPTY_UUID ? `${this.workflowPath}/${id}` : undefined;
    });

    readonly approvalWorkflow = computed(
        () => this.approvalWorkflowResource.value() ?? undefined,
    );
    readonly approvalWorkflowLoading = computed(() =>
        this.approvalWorkflowResource.isLoading(),
    );
    readonly approvalWorkflowError = computed(() => this.approvalWorkflowResource.error());

    setApprovalWorkflowId(id: string | undefined) {
        if (this.approvalWorkflowId() !== id) {
            this.approvalWorkflowId.set(id);
        }
    }

    refreshList() {
        // this.approvalWorkflowResource.reload();
    }

    refreshDetail() {
        this.approvalWorkflowResource.reload();
    }
}
