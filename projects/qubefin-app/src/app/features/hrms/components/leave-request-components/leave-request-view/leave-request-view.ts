import { DatePipe, CommonModule } from '@angular/common';
import { Component, effect, inject, model, output } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { EMPTY_UUID } from 'qubefin-core';
import { APP_ICONS_MAP } from '../../../../../lucide-icons';
import { LeaveRequestStore } from '../../../stores/leave-request-store';
import { LeaveRequestService } from '../../../services/leave-request-service';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'qfin-leave-request-view',
  imports: [DatePipe, CommonModule, LucideDynamicIcon, MatTooltipModule],
  templateUrl: './leave-request-view.html',
  styles: ``,
})
export class LeaveRequestView {
  readonly iconMap = APP_ICONS_MAP;
  private readonly leaveRequestStore = inject(LeaveRequestStore);
  private readonly leaveRequestService = inject(LeaveRequestService);

  readonly leaveRequestId = model<string>(EMPTY_UUID);
  readonly delete = output<void>();

  readonly leaveRequest = this.leaveRequestStore.leaveRequest;
  readonly loading = this.leaveRequestStore.leaveRequestLoading;
  readonly error = this.leaveRequestStore.leaveRequestError;

  constructor() {
    effect(() => {
      this.leaveRequestStore.setLeaveRequestId(this.leaveRequestId());
    });
  }

  onDelete() {
    if (confirm('Are you sure you want to delete this leave request?')) {
      this.leaveRequestService.delete(this.leaveRequestId()).subscribe({
        next: () => {
          this.leaveRequestStore.refreshList();
          this.delete.emit();
        }
      });
    }
  }
}
