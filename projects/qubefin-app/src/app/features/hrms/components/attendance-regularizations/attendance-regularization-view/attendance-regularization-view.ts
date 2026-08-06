import { Component, computed, effect, inject, model, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideDynamicIcon, LucideIcon } from '@lucide/angular';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import { AttendanceRegularizationsStore } from '../../../stores/attendance-regularizations-store';
import { MatFormFieldModule } from '@angular/material/form-field';
import Swal from 'sweetalert2';
import { AttendanceService } from '../../../services/attendance-service';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { ApprovalRegularizationStore } from '../../../stores/approval-regularizations-store';
@Component({
  selector: 'qfin-attendance-regularization-view',
  imports: [
    CommonModule,
    LucideDynamicIcon,
    MatFormFieldModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './attendance-regularization-view.html',
  styles: ``,
})
export class AttendanceRegularizationView {
  private readonly store = inject(ApprovalRegularizationStore);
  private readonly alertService = inject(AlertService);
  private readonly attendanceService = inject(AttendanceService);
  readonly regularizationId = model<string>(EMPTY_UUID);
  readonly save = output<void>();
  readonly showEdit = output<void>();
  readonly detail = this.store.regularization;
  readonly loading = this.store.regularizationUnitLoading;
  readonly error = this.store.regularizationUnitError;
  constructor() {
    effect(() => {
      this.store.setRegularizationId(this.regularizationId());
      this.remarks.set('');
    });
  }
  readonly remarks = signal<string>('');

  onSubmitDecision(decision: string) {
    if (!this.remarks().trim()) {
      this.alertService.warning('Warning', 'Remarks are mandatory.');
      return;
    }

    const payload = {
      id: this.regularizationId(),
      decision: decision,
      remarks: this.remarks(),
    };

    this.alertService
      .confirm('Confirmation', `You are about to submit the decision as: ${decision}`, 'Yes', 'No')
      .then((result) => {
        if (result.isConfirmed) {
          this.attendanceService.submitRegularization(payload).subscribe({
            next: (resp: any) => {
              this.alertService.success('Success', resp.value.message).then(() => {
                this.save.emit();
                this.store.refreshDetail();
                this.store.refreshList();
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
