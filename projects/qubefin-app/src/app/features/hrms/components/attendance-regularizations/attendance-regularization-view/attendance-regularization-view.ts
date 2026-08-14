import { Component, computed, effect, inject, model, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideDynamicIcon, LucideIcon } from '@lucide/angular';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AttendanceService } from '../../../services/attendance-service';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { ApprovalRegularizationStore } from '../../../stores/approval-regularizations-store';
import { form, FormField, required, schema, Schema } from '@angular/forms/signals';
import { MatTooltipModule } from '@angular/material/tooltip';
@Component({
  selector: 'qfin-attendance-regularization-view',
  imports: [
    CommonModule,
    LucideDynamicIcon,
    MatFormFieldModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    FormField,
    MatTooltipModule,
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
  readonly decisionModel = signal({ remarks: '' });
  protected readonly decisionSchema: Schema<{ remarks: string }> = schema((path) => {
    required(path.remarks, { message: 'Remarks are required' });
  });
  protected readonly decisionForm = form(this.decisionModel, this.decisionSchema);
  constructor() {
    effect(() => {
      this.store.setRegularizationId(this.regularizationId());
      this.decisionModel.set({ remarks: '' });
    });
  }
  viewDocument(url: any) {
    window.open(url, '_blank');
  }
  onSubmitDecision(decision: string) {
    const curentRemarks = this.decisionModel().remarks;
    if (decision === 'Rejected' && !curentRemarks.trim()) {
      this.alertService.warning('Warning', 'Remarks are mandatory.');
      return;
    }

    const payload = {
      id: this.regularizationId(),
      decision: decision,
      remarks: curentRemarks,
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
