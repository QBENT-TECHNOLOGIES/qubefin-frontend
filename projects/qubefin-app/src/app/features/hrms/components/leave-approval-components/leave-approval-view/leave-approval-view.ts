import { DatePipe, CommonModule } from '@angular/common';
import { Component, effect, inject, model, output } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { EMPTY_UUID } from 'qubefin-core';
import { APP_ICONS_MAP } from '../../../../../lucide-icons';
import { LeaveRequestStore } from '../../../stores/leave-request-store';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'qfin-leave-approval-view',
  imports: [DatePipe, CommonModule, LucideDynamicIcon, MatTooltipModule],
  templateUrl: './leave-approval-view.html',
  styles: ``,
})
export class LeaveApprovalView {
  readonly iconMap = APP_ICONS_MAP;
  private readonly leaveRequestStore = inject(LeaveRequestStore);

  readonly leaveApprovalId = model<string>(EMPTY_UUID);
  readonly delete = output<void>();

  readonly leaveApproval = this.leaveRequestStore.leaveRequest;
  readonly loading = this.leaveRequestStore.leaveRequestLoading;
  readonly error = this.leaveRequestStore.leaveRequestError;

  constructor() {
    effect(() => {
      this.leaveRequestStore.setLeaveRequestId(this.leaveApprovalId());
    });
  }
}
