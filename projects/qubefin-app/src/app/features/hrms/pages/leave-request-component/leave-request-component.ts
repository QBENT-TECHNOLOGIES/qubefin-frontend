import { EMPTY_UUID } from 'qubefin-core';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { CommonModule } from '@angular/common';

import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { LeaveRequestStore } from '../../stores/leave-request-store';
import { LeaveRequestList } from '../../components/leave-request-components/leave-request-list/leave-request-list';
import { LeaveRequestView } from '../../components/leave-request-components/leave-request-view/leave-request-view';
import { LeaveRequestDetail } from '../../components/leave-request-components/leave-request-detail/leave-request-detail';

@Component({
  selector: 'qfin-leave-request-component',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
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
  readonly selectedLeaveRequestId = signal<string>(EMPTY_UUID);

  readonly currentYear = new Date().getFullYear();
  readonly yearsList = Array.from({ length: 4 }, (_, i) => this.currentYear - i);
  readonly selectedYear = signal(this.currentYear);

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
  onYearChange(year: number) {
    this.selectedYear.set(year);
    this.leaveRequestStore.setYearQuery(year);

  }



  // ===========================
  // Form Events
  // ===========================
  protected onEditRequest() {
    this.isViewMode.set(false);
  }

  protected onSaveRequest() {
    this.closePanel();
  }
}
