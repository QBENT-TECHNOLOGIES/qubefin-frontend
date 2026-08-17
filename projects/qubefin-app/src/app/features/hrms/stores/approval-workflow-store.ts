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
  readonly searchQuery = signal('');
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly sortOn = signal('assignedFrom');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');
  private readonly approvalWorkflowsResource = httpResource<IApprovalWorkflow[]>(
    () => this.workflowPath,
  );

  readonly approvalWorkflows = computed(() => this.approvalWorkflowsResource.value() ?? []);
  readonly loading = computed(() => this.approvalWorkflowsResource.isLoading());
  readonly error = computed(() => this.approvalWorkflowsResource.error());

  private readonly approvalWorkflowResource = httpResource<IApprovalWorkflow>(() => {
    const id = this.approvalWorkflowId();
    return id && id !== EMPTY_UUID ? `${this.workflowPath}/${id}` : undefined;
  });

  readonly approvalWorkflow = computed(() => this.approvalWorkflowResource.value() ?? undefined);
  readonly approvalWorkflowLoading = computed(() => this.approvalWorkflowResource.isLoading());
  readonly approvalWorkflowError = computed(() => this.approvalWorkflowResource.error());

  setApprovalWorkflowId(id: string | undefined) {
    if (this.approvalWorkflowId() !== id) {
      this.approvalWorkflowId.set(id);
    }
  }

  setSearchQuery(query: string) {
    this.searchQuery.set(query);
    this.pageIndex.set(0);
  }

  setPage(index: number) {
    this.pageIndex.set(index);
  }

  setPageSize(items: number) {
    this.pageSize.set(items);
  }

  setSort(sort: string, direction: 'asc' | 'desc') {
    this.sortOn.set(sort);
    this.sortDirection.set(direction);
    this.pageIndex.set(0);
  }
  refreshList() {
    this.approvalWorkflowsResource.reload();
  }

  refreshDetail() {
    this.approvalWorkflowResource.reload();
  }

  // Leave Type Drop Down
  readonly leaveTypesResource = httpResource<any[]>(() => `${ApiPaths.HRMS}/leave-types`);

  readonly leaveTypes = computed(() => this.leaveTypesResource.value() ?? []);
  readonly leaveTypesLoading = computed(() => this.leaveTypesResource.isLoading());
  readonly leaveTypesError = computed(() => this.leaveTypesResource.error());

  // Post Drop Down
  readonly postsResource = httpResource<any[]>(() => `${ApiPaths.HRMS}/posts`);

  readonly posts = computed(() => this.postsResource.value() ?? []);
  readonly postsLoading = computed(() => this.postsResource.isLoading());
  readonly postsError = computed(() => this.postsResource.error());

  // Salary Grade Drop Down
  readonly salaryGradesResource = httpResource<any[]>(() => `${ApiPaths.PAYROLL}/salary-grade`);

  readonly salaryGrades = computed(() => this.salaryGradesResource.value() ?? []);
  readonly salaryGradesLoading = computed(() => this.salaryGradesResource.isLoading());
  readonly salaryGradesError = computed(() => this.salaryGradesResource.error());
}
