import { DatePipe, CommonModule } from '@angular/common';
import { Component, effect, inject, model, output, signal } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import { APP_ICONS_MAP } from '../../../../../lucide-icons';
import { LeaveRequestStore } from '../../../stores/leave-request-store';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { LeaveRequestService } from '../../../services/leave-request-service';
import { LeaveApprovalStore } from '../../../stores/leave-approval-store';

@Component({
  selector: 'qfin-leave-approval-view',
  imports: [
    DatePipe,
    CommonModule,
    LucideDynamicIcon,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  templateUrl: './leave-approval-view.html',
  styles: ``,
})
export class LeaveApprovalView {
  readonly iconMap = APP_ICONS_MAP;
  private readonly leaveRequestStore = inject(LeaveRequestStore);
  private readonly leaveApprovalStore = inject(LeaveApprovalStore);
  private readonly alertService = inject(AlertService);
  private readonly leaveRequestService = inject(LeaveRequestService);

  readonly leaveApprovalId = model<string>(EMPTY_UUID);
  readonly delete = output<void>();
  readonly approve = output<void>();
  readonly reject = output<void>();
  readonly recommend = output<void>();

  readonly leaveApproval = this.leaveRequestStore.leaveRequest;
  readonly loading = this.leaveRequestStore.leaveRequestLoading;
  readonly error = this.leaveRequestStore.leaveRequestError;
  readonly showError = signal(false);

  rejectedReasonControl = new FormControl('', {
    nonNullable: true,
    validators: [],
  });
  constructor() {
    effect(() => {
      this.leaveRequestStore.setLeaveRequestId(this.leaveApprovalId());
    });
  }

  protected onAction(action: 'approve' | 'reject' | 'recommend') {
    if (action === 'reject') {
      this.rejectedReasonControl.setValidators([Validators.required]);
      this.rejectedReasonControl.updateValueAndValidity();
      const remarks = this.rejectedReasonControl.value.trim();

      if (!remarks) {
        this.alertService.warning(null, 'Please enter remarks.');
        this.showError.set(true);
        this.rejectedReasonControl.markAsTouched();
        return;
      }
    }

    this.rejectedReasonControl.clearValidators();
    this.rejectedReasonControl.updateValueAndValidity();
    this.showError.set(false);

    this.alertService
      .confirm(null, `Are you sure you want to ${action} this leave application?`, 'Yes', 'No')
      .then((result: any) => {
        if (result.isConfirmed) {
          const payLoad: any = {
            leaveRequestId: this.leaveApproval()?.id,
            isApproved: action === 'approve',
            isRejected: action === 'reject',
            rejectedReason: action === 'reject' ? this.rejectedReasonControl.value : null,
          };

          this.leaveRequestService.leaveAction(payLoad).subscribe({
            next: (resp: any) => {
              this.alertService.success('Success', resp).then(() => {
                this.leaveApprovalStore.refreshList();
                if (action === 'approve') this.approve.emit();
                if (action === 'reject') this.reject.emit();
                if (action === 'recommend') this.recommend.emit();
              });
            },
            error: (err: any) => {},
          });
        }
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
