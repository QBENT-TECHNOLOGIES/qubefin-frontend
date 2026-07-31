import { Component, computed, effect, inject, model, output, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { LucideDynamicIcon, LucideIcon } from '@lucide/angular';
import { EMPTY_UUID } from 'qubefin-core';
import { AttendanceRegularizationsStore } from '../../../stores/attendance-regularizations-store';
import { MatFormFieldModule } from '@angular/material/form-field';
import Swal from 'sweetalert2';
import { AttendanceService } from '../../../services/attendance-service';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'qfin-attendance-regularization-view',
  imports: [
    CommonModule,
    DatePipe,
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
  private readonly store = inject(AttendanceRegularizationsStore);
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
  // onEdit() {
  //   this.showEdit.emit();
  // }
  onSubmitDecision(decision: string) {
    if (decision === 'Rejected' && !this.remarks().trim()) {
      Swal.fire('Warning', 'Remarks are mandatory when rejecting.', 'warning');
      return;
    }

    const payload = {
      id: this.regularizationId(),
      decision: decision,
      remarks: this.remarks(),
    };

    Swal.fire({
      title: 'Are you sure?',
      text: `You are about to submit the decision as: ${decision}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: `Yes, ${decision}`,
    }).then((result) => {
      if (result.isConfirmed) {
        this.attendanceService.submitRegularization(payload).subscribe({
          next: (resp: any) => {
            Swal.fire(
              'Success!',
              resp.message || `Successfully marked as ${decision}`,
              'success',
            ).then(() => {
              this.save.emit();
            });
          },
          error: (err: any) => {
            Swal.fire('Error!', err.error?.message || 'Something went wrong', 'error');
          },
        });
      }
    });
  }
}
