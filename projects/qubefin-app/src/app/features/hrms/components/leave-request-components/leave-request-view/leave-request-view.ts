import { DatePipe, CommonModule } from '@angular/common';
import { Component, effect, inject, model, output, signal } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { EMPTY_UUID } from 'qubefin-core';
import { APP_ICONS_MAP } from '../../../../../lucide-icons';
import { LeaveRequestStore } from '../../../stores/leave-request-store';
import { LeaveRequestService } from '../../../services/leave-request-service';
import { MatTooltipModule } from '@angular/material/tooltip';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'qfin-leave-request-view',
  imports: [DatePipe, CommonModule, LucideDynamicIcon, MatTooltipModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule],
  templateUrl: './leave-request-view.html',
  styles: ``,
})
export class LeaveRequestView {
  readonly iconMap = APP_ICONS_MAP;
  private readonly leaveRequestStore = inject(LeaveRequestStore);
  private readonly leaveRequestService = inject(LeaveRequestService);

  readonly leaveRequestId = model<string>(EMPTY_UUID);
  readonly delete = output<void>();
  readonly edit = output<void>();
  cancelReasonControl = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  isCancelling = signal(false);
  readonly leaveRequest = this.leaveRequestStore.leaveRequest;
  readonly loading = this.leaveRequestStore.leaveRequestLoading;
  readonly error = this.leaveRequestStore.leaveRequestError;

  constructor() {
    effect(() => {
      this.leaveRequestStore.setLeaveRequestId(this.leaveRequestId());
    });
    effect(() => {
      const req = this.leaveRequest(); // assuming `request` is a signal/input — adjust if it's a plain @Input()
      if (req?.isCancellable && req?.rejectedReason) {
        this.cancelReasonControl.setValue(req.rejectedReason);
      }
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

  onEdit() {
    this.edit.emit();
  }

  onSubmit() {
    this.leaveRequestService.submit(this.leaveRequestId()).subscribe({
      next: () => {
        this.leaveRequestStore.refreshList();
        this.leaveRequestStore.refreshDetail();
      }
    });
  }

  onCancel() {
    this.cancelReasonControl.markAsTouched();

    if (this.cancelReasonControl.invalid) {
      return;
    }

    this.isCancelling.set(true);

    this.leaveRequestService.cancelRequest(this.leaveRequestId(), this.cancelReasonControl.value).subscribe({
      next: (resp: any) => {
        if (resp.value && resp.value.success) {
          this.leaveRequestStore.refreshList();
          this.leaveRequestStore.refreshDetail();
          this.isCancelling.set(false);
        }
      },
      error: (resp: any) => {
        this.isCancelling.set(false);
        // surface this via a toast/snackbar rather than alert() — plug in whatever
        // notification service the rest of the app uses
      }
    });
  }
}
