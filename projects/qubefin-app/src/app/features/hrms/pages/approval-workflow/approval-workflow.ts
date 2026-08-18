import { Component, computed, inject, model, signal } from '@angular/core';
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
import { OrganizationUnitTypeStore } from '../../../global/stores/organization-unit-type-store';
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
  private readonly organizationUnitTypeStore = inject(OrganizationUnitTypeStore);

  selectedWorkflowId = signal<string>(EMPTY_UUID);
  isViewMode = signal<boolean>(true);
  readonly showFilterArea = signal<boolean>(false);
  readonly categories = signal<string[]>(['LEAVE', 'LEAVE_PRAYER', 'ONDUTY', 'ATTENDANCE']);

  readonly organizationUnitTypes = this.organizationUnitTypeStore.organizationUnitTypes;
  workflows = this.approvalWorkflowStore.approvalWorkflows;
  public readonly EMPTY_UUID = EMPTY_UUID;
  hasSelectedWorkflow = computed(
    () => this.selectedWorkflowId() !== EMPTY_UUID || !this.isViewMode(),
  );
  readonly searchText = model<string>('');
  readonly categoryFilter = model<string>('');
  readonly organizationUnitTypeFilter = model<string>('');

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
    this.approvalWorkflowStore.setCategory(this.categoryFilter() || null);
    this.approvalWorkflowStore.setOrganizationUnitTypeId(this.organizationUnitTypeFilter() || null);
  }
  protected resetFilters() {
    this.searchText.set('');
    this.categoryFilter.set('');
    this.organizationUnitTypeFilter.set('');
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
}
