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
import { LeaveRequestStore } from '../../stores/leave-request-store';
import { LeaveRequestList } from '../../components/leave-request-components/leave-request-list/leave-request-list';
import { LeaveRequestView } from '../../components/leave-request-components/leave-request-view/leave-request-view';
import { LeaveRequestDetail } from '../../components/leave-request-components/leave-request-detail/leave-request-detail';

@Component({
  selector: 'qfin-leave-request-component',
  imports: [
    FormField,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatIconModule,
    MatTooltipModule,
    LucideDynamicIcon,
    CommonModule,
    LeaveRequestList,
    LeaveRequestView,
    LeaveRequestDetail,
  ],
  templateUrl: './leave-request-component.html',
  styles: ``,
})
export class LeaveRequestComponent {
  // ===========================
  // Constants
  // ===========================
  public readonly EMPTY_UUID = EMPTY_UUID;
  readonly iconMap = APP_ICONS_MAP;

  // ===========================
  // Dependency Injection
  // ===========================
  readonly leaveRequestStore = inject(LeaveRequestStore);

  // ===========================
  // Component State
  // ===========================
  readonly isViewMode = signal<boolean>(true);
  readonly showFilterArea = signal<boolean>(false);
  readonly selectedLeaveRequestId = signal<string>(EMPTY_UUID);
  
  readonly searchModel = signal({ tempSearch: '' });
  readonly searchForm = form(this.searchModel);

  // ===========================
  // Store Data
  // ===========================
  readonly leaveRequests = this.leaveRequestStore.leaveRequests;
  readonly hasSelectedLeaveRequest = computed(
    () => this.selectedLeaveRequestId() !== EMPTY_UUID || !this.isViewMode(),
  );

  // ===========================
  // Panel Actions
  // ===========================
  protected onView(id: string) {
    this.selectedLeaveRequestId.set(id);
    this.isViewMode.set(true);
  }
  
  protected onEdit() {
    this.isViewMode.set(false);
  }
  
  protected onAdd() {
    this.isViewMode.set(false);
    this.selectedLeaveRequestId.set(EMPTY_UUID);
  }
  
  protected closePanel() {
    this.selectedLeaveRequestId.set(EMPTY_UUID);
    this.isViewMode.set(true);
  }

  // ===========================
  // Filter Actions
  // ===========================
  protected toggleFilterArea() {
    this.showFilterArea.update((v) => !v);
  }
  
  protected applyFilters() {
    this.leaveRequestStore.setSearchQuery(this.searchForm.tempSearch().value());
  }
  
  protected resetFilters() {
    this.searchModel.update((m) => ({ ...m, tempSearch: '' }));
    this.applyFilters();
  }

  // ===========================
  // Table Actions
  // ===========================
  protected changePage(delta: number) {
    const current = this.leaveRequestStore.pageIndex();
    const next = current + delta;
    if (next >= 0) {
      this.leaveRequestStore.setPage(next);
    }
  }
  
  pageChanged(event: PageEvent) {
    this.leaveRequestStore.setPage(event.pageIndex);
    this.leaveRequestStore.setPageSize(event.pageSize);
  }
  
  onSortChanged(sort: Sort) {
    if (!sort.direction) {
      return;
    }
    this.leaveRequestStore.setSort(sort.active, sort.direction as 'asc' | 'desc');
  }

  // ===========================
  // Form Events
  // ===========================
  protected onSaveRequest() {
    this.closePanel();
  }
}
