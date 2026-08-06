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

  getStatusClass(status: string | null | undefined): string {
    switch (status) {
      case 'Approved':
        return 'text-emerald-600 dark:text-emerald-400';

      case 'Rejected':
        return 'text-rose-600 dark:text-rose-400';

      case 'Cancelled':
        return 'text-slate-600 dark:text-slate-400';

      case 'Pending':
        return 'text-yellow-600 dark:text-yellow-400';

      default:
        return 'text-blue-600 dark:text-blue-400';
    }
  }

  getStatusPingClass(status: string | null | undefined): string {
    switch (status) {
      case 'Approved':
        return 'bg-emerald-400';

      case 'Rejected':
        return 'bg-rose-400';

      case 'Cancelled':
        return 'bg-slate-400';

      case 'Pending':
        return 'bg-yellow-400';

      default:
        return 'bg-blue-400';
    }
  }

  getStatusDotClass(status: string | null | undefined): string {
    switch (status) {
      case 'Approved':
        return 'bg-emerald-500';

      case 'Rejected':
        return 'bg-rose-500';

      case 'Cancelled':
        return 'bg-slate-500';

      case 'Pending':
        return 'bg-yellow-500';

      default:
        return 'bg-blue-500';
    }
  }
}
