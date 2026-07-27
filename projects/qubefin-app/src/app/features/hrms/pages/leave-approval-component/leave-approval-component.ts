import { EMPTY_UUID } from 'qubefin-core';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { CommonModule } from '@angular/common';
import { form, FormField } from '@angular/forms/signals';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';

import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { LeaveApprovalStore } from '../../stores/leave-approval-store';
import { LeaveApprovalList } from '../../components/leave-approval-components/leave-approval-list/leave-approval-list';
import { LeaveApprovalView } from '../../components/leave-approval-components/leave-approval-view/leave-approval-view';
import { LeaveApprovalDetail } from '../../components/leave-approval-components/leave-approval-detail/leave-approval-detail';

@Component({
  selector: 'qfin-leave-approval-component',
  imports: [
    FormField,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatIconModule,
    MatTooltipModule,
    LucideDynamicIcon,
    CommonModule,
    LeaveApprovalList,
    LeaveApprovalView,
    LeaveApprovalDetail,
  ],
  templateUrl: './leave-approval-component.html',
  styles: ``,
})
export class LeaveApprovalComponent {
  public readonly EMPTY_UUID = EMPTY_UUID;
  readonly iconMap = APP_ICONS_MAP;

  readonly leaveApprovalStore = inject(LeaveApprovalStore);

  readonly isViewMode = signal<boolean>(true);
  readonly showFilterArea = signal<boolean>(false);
  readonly selectedLeaveApprovalId = signal<string>(EMPTY_UUID);
  
  readonly searchModel = signal({ tempSearch: '' });
  readonly searchForm = form(this.searchModel);

  readonly leaveApprovals = this.leaveApprovalStore.leaveApprovals;
  readonly hasSelectedLeaveApproval = computed(
    () => this.selectedLeaveApprovalId() !== EMPTY_UUID || !this.isViewMode(),
  );

  protected onView(id: string) {
    this.selectedLeaveApprovalId.set(id);
    this.isViewMode.set(true);
  }
  
  protected onActionMode() {
    this.isViewMode.set(false);
  }
  
  protected closePanel() {
    this.selectedLeaveApprovalId.set(EMPTY_UUID);
    this.isViewMode.set(true);
  }

  protected toggleFilterArea() {
    this.showFilterArea.update((v) => !v);
  }
  
  protected applyFilters() {
    this.leaveApprovalStore.setSearchQuery(this.searchForm.tempSearch().value());
  }
  
  protected resetFilters() {
    this.searchModel.update((m) => ({ ...m, tempSearch: '' }));
    this.applyFilters();
  }

  protected changePage(delta: number) {
    const current = this.leaveApprovalStore.pageIndex();
    const next = current + delta;
    if (next >= 0) {
      this.leaveApprovalStore.setPage(next);
    }
  }
  
  pageChanged(event: PageEvent) {
    this.leaveApprovalStore.setPage(event.pageIndex);
    this.leaveApprovalStore.setPageSize(event.pageSize);
  }
  
  onSortChanged(sort: Sort) {
    if (!sort.direction) {
      return;
    }
    this.leaveApprovalStore.setSort(sort.active, sort.direction as 'asc' | 'desc');
  }

  protected onActionCompleted() {
    this.closePanel();
  }
}
