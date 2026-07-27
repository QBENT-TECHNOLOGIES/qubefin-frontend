import { DatePipe, CommonModule } from '@angular/common';
import { Component, effect, inject, model, output } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { EMPTY_UUID } from 'qubefin-core';
import { APP_ICONS_MAP } from '../../../../../lucide-icons';
import { LeaveApprovalStore } from '../../../stores/leave-approval-store';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'qfin-leave-approval-view',
  imports: [DatePipe, CommonModule, LucideDynamicIcon, MatTooltipModule],
  templateUrl: './leave-approval-view.html',
  styles: ``,
})
export class LeaveApprovalView {
  readonly iconMap = APP_ICONS_MAP;
  private readonly leaveApprovalStore = inject(LeaveApprovalStore);

  readonly leaveApprovalId = model<string>(EMPTY_UUID);
  readonly delete = output<void>();

  readonly leaveApproval = this.leaveApprovalStore.leaveApproval;
  readonly loading = this.leaveApprovalStore.leaveApprovalLoading;
  readonly error = this.leaveApprovalStore.leaveApprovalError;

  constructor() {
    effect(() => {
      this.leaveApprovalStore.setLeaveApprovalId(this.leaveApprovalId());
    });
  }

  onDelete() {
    if (confirm('Are you sure you want to delete this leave approval record?')) {
      // Mock delete
      this.leaveApprovalStore.refreshList();
      this.delete.emit();
    }
  }
}
