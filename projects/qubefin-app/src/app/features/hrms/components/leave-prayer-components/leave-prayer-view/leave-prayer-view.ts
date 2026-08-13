import { DatePipe, CommonModule } from '@angular/common';
import { Component, effect, inject, model, output, signal } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import { APP_ICONS_MAP } from '../../../../../lucide-icons';
import { MatTooltipModule } from '@angular/material/tooltip';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { DocumentModalService } from '../../../../../shared/services/document-modal.service';
import { LeavePrayerStore } from '../../../stores/leave-prayer-store';
import { LeavePrayerService } from '../../../services/leave-prayer-service';
import { LeavePrayerApprovalStore } from '../../../stores/leave-prayer-approval-store';

@Component({
  selector: 'qfin-leave-prayer-view',
  imports: [
    DatePipe,
    CommonModule,
    LucideDynamicIcon,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  templateUrl: './leave-prayer-view.html',
  styles: ``,
})
export class LeavePrayerView {
  readonly iconMap = APP_ICONS_MAP;
  private readonly leavePrayerService = inject(LeavePrayerService);
  private readonly leavePrayerApprovalStore = inject(LeavePrayerApprovalStore);
  private readonly leavePrayerStore = inject(LeavePrayerStore);
  private readonly alertService = inject(AlertService);
  readonly documentModal = inject(DocumentModalService);
  readonly leavePrayerId = model<string>(EMPTY_UUID);
  readonly delete = output<void>();
  readonly approve = output<void>();
  readonly reject = output<void>();
  readonly recommend = output<void>();
  readonly leavePrayer = this.leavePrayerStore.leavePrayer;
  readonly loading = this.leavePrayerStore.leavePrayerLoading;
  readonly error = this.leavePrayerStore.leavePrayerError;
  // readonly showError = signal(false);

  // rejectedReasonControl = new FormControl('', {
  //   nonNullable: true,
  //   validators: [],
  // });
  constructor() {
    effect(() => {
      this.leavePrayerStore.setLeaveRequestId(this.leavePrayerId());
    });
    // effect(() => {
    //   const req = this.leaveRequest(); // assuming `request` is a signal/input — adjust if it's a plain @Input()
    //   if (req?.isCancellable && req?.rejectedReason) {
    //     this.cancelReasonControl.setValue(req.rejectedReason);
    //   }
    // });
  }
  openDocument(url: any, name: any) {
    if (!url || !name) {
      return;
    }

    this.documentModal.open({
      url: url,
      documentName: name,
      extension: name.split('.').pop()?.toLowerCase() || '',
      downloadAccess: true,
    });
  }
  formatDocumentName(fileName: string | null | undefined): string {
    if (!fileName) return '-';
    return fileName.replace(/^\d+_/, '');
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
  protected onAction(action: 'approve' | 'reject' | 'recommend') {
    // if (action === 'reject') {
    //   this.rejectedReasonControl.setValidators([Validators.required]);
    //   this.rejectedReasonControl.updateValueAndValidity();
    //   const remarks = this.rejectedReasonControl.value.trim();

    //   if (!remarks) {
    //     this.alertService.warning(null, 'Please enter remarks.');
    //     this.showError.set(true);
    //     this.rejectedReasonControl.markAsTouched();
    //     return;
    //   }
    // }

    // this.rejectedReasonControl.clearValidators();
    // this.rejectedReasonControl.updateValueAndValidity();
    // this.showError.set(false);

    this.alertService
      .confirm(null, `Are you sure you want to ${action} this leave prayer?`, 'Yes', 'No')
      .then((result: any) => {
        if (result.isConfirmed) {
          const payLoad: any = {
            leavePrayerId: this.leavePrayer()?.id, // Ensure this property name matches your backend DTO
            isApproved: action === 'approve',
            isRejected: action === 'reject',
            rejectedReason: null,
          };
          this.leavePrayerService.leavePrayerAction(payLoad).subscribe({
            next: (resp: any) => {
              this.alertService.success('Success', resp.value.message).then(() => {
                this.leavePrayerApprovalStore.refreshList();
                if (action === 'approve') this.approve.emit();
                if (action === 'reject') this.reject.emit();
                if (action === 'recommend') this.recommend.emit();
              });
            },
            error: (err: any) => {
              this.alertService.error('Failed', err.error.message);
            },
          });
        }
      });
  }
}
