import { Component, computed, inject, signal } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { ApprovalWorkflowStore } from '../../stores/approval-workflow-store';
import { CommonModule } from '@angular/common';
import { EMPTY_UUID } from 'qubefin-core';
import { ApprovalWorkflowList } from '../../components/approval-workflows/approval-workflow-list/approval-workflow-list';
import { ApprovalWorkflowView } from '../../components/approval-workflows/approval-workflow-view/approval-workflow-view';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { ApprovalWorkflowDetail } from '../../components/approval-workflows/approval-workflow-detail/approval-workflow-detail';
@Component({
  selector: 'qfin-approval-workflow',
  imports: [
    CommonModule,
    LucideDynamicIcon,
    ApprovalWorkflowList,
    ApprovalWorkflowView,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    FormsModule,
    MatSlideToggleModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    LucideDynamicIcon,
    ApprovalWorkflowDetail,
  ],
  templateUrl: './approval-workflow.html',
})
export class ApprovalWorkflow {
  protected readonly approvalWorkflowStore = inject(ApprovalWorkflowStore);

  isViewMode = signal<boolean>(true);
  readonly showFilterArea = signal<boolean>(false);
  workflows = this.approvalWorkflowStore.approvalWorkflows;
  public readonly EMPTY_UUID = EMPTY_UUID;
  selectedWorkflowId = signal<string>(EMPTY_UUID);
  hasSelectedWorkflow = computed(() => this.selectedWorkflowId() !== EMPTY_UUID);
  readonly searchText = signal<string>('');
  protected onView(id: string) {
    this.selectedWorkflowId.set(id);
    this.isViewMode.set(true);
  }

  protected onEdit() {
    this.isViewMode.set(false);
  }
  protected onAdd() {
    this.isViewMode.set(false);
    this.selectedWorkflowId.set(EMPTY_UUID);
  }
  protected closePanel() {
    this.selectedWorkflowId.set(EMPTY_UUID);
    this.isViewMode.set(true);
  }
  protected toggleFilterArea() {
    this.showFilterArea.update((v) => !v);
  }
  protected applyFilters() {
    this.approvalWorkflowStore.setSearchQuery(this.searchText());
  }
  protected resetFilters() {
    this.searchText.set('');
    this.applyFilters();
  }
  protected changePage(delta: number) {
    const current = this.approvalWorkflowStore.pageIndex();
    const next = current + delta;
    if (next >= 0) {
      this.approvalWorkflowStore.setPage(next);
    }
  }
  pageChanged(event: PageEvent) {
    this.approvalWorkflowStore.setPage(event.pageIndex);
    this.approvalWorkflowStore.setPageSize(event.pageSize);
  }
  onSortChanged(sort: Sort) {
    if (!sort.direction) {
      return;
    }

    this.approvalWorkflowStore.setSort(sort.active, sort.direction as 'asc' | 'desc');
  }
  protected onSave() {
    this.closePanel();
  }
  // protected readonly categories = ['Leave', 'Organization Unit', 'Salary Grade', 'Post'];
  // protected readonly eventStatuses = ['Pending', 'Recommended', 'Approved', 'Rejected'];

  // protected readonly workflowEventModel = signal<IApprovalWorkflowEvent>({
  // 	id: '',
  // 	category: 'Leave',
  // 	leaveTypeId: '',
  // 	organizationUnitTypeId: '',
  // 	salaryGradeId: '',
  // 	postId: '',
  // 	minimumDays: 0,
  // 	maximumDays: null,
  // 	sequenceNo: 1,
  // 	receiverPostId: '',
  // 	isRecommendEvent: false,
  // 	isApprovalEvent: true,
  // 	eventStatus: 'Pending',
  // 	eventButtonText: 'Approve',
  // });

  // protected readonly workflowEventSchema: Schema<IApprovalWorkflowEvent> = schema(path => {
  // 	required(path.category, { message: 'Category is required' });
  // 	required(path.receiverPostId, { message: 'Receiver post is required' });
  // 	required(path.eventStatus, { message: 'Event status is required' });
  // 	required(path.eventButtonText, { message: 'Button text is required' });
  // });

  // protected readonly workflowEventForm = form(this.workflowEventModel, this.workflowEventSchema);

  // protected save(): void {
  // 	if (!this.workflowEventForm().valid()) {
  // 		return;
  // 	}

  // 	const value = this.workflowEventForm().value();
  // 	const workflowEvent: IApprovalWorkflowEvent = {
  // 		...value,
  // 		leaveTypeId: value.leaveTypeId || null,
  // 		organizationUnitTypeId: value.organizationUnitTypeId || null,
  // 		salaryGradeId: value.salaryGradeId || null,
  // 		postId: value.postId || null,
  // 	};
  // 	console.log('Approval workflow event', workflowEvent);
  // }
}
