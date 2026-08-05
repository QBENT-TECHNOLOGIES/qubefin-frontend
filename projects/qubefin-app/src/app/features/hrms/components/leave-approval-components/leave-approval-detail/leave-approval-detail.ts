import { CommonModule, DatePipe } from '@angular/common';
import { Component, effect, inject, input, output, signal } from '@angular/core';
import { form, FormField, required, schema, Schema } from '@angular/forms/signals';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { EMPTY_UUID } from 'qubefin-core';
import { LeaveApprovalStore } from '../../../stores/leave-approval-store';
import { LucideDynamicIcon } from '@lucide/angular';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { ILeaveApprovalDetailItem } from '../../../models/leave-approval';
import { DocumentModalService } from '../../../../../shared/services/document-modal.service';
import { LeaveRequestStore } from '../../../stores/leave-request-store';

@Component({
  selector: 'qfin-leave-approval-detail',
  imports: [
    CommonModule,
    FormField,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatInputModule,
    LucideDynamicIcon,
    MatDatepickerModule,
    MatButtonModule,
  ],
  providers: [provideNativeDateAdapter(), DatePipe],
  templateUrl: './leave-approval-detail.html',
  styles: ``,
})
export class LeaveApprovalDetail {
  private readonly leaveApprovalStore = inject(LeaveApprovalStore);
  private readonly leaveRequestStore = inject(LeaveRequestStore);
  private readonly dateAdapter = inject(DateAdapter<Date>);
  readonly documentModal = inject(DocumentModalService);
  private readonly datePipe = inject(DatePipe);

  readonly leaveApprovalId = input<string>(EMPTY_UUID);

  readonly cancel = output<void>();
  readonly approve = output<void>();
  readonly reject = output<void>();
  readonly recommend = output<void>();

  readonly leaveApproval = this.leaveRequestStore.leaveRequest;
  readonly loading = this.leaveRequestStore.leaveRequestLoading;

  readonly leaveTypeOptions = [
    'Sick Leave',
    'Casual Leave',
    'Earned Leave',
    'Maternity Leave',
    'Paternity Leave',
  ];

  public readonly documentUrl = signal<string>('');
  public readonly documentName = signal<string>('Document');

  protected readonly leaveApprovalModel = signal<ILeaveApprovalDetailItem>({
    id: EMPTY_UUID,
    employeeName: '',
    leaveType: '',
    fromDate: '',
    toDate: '',
    reason: '',
    address: '',
    remarks: '',
  });

  protected readonly leaveApprovalSchema: Schema<ILeaveApprovalDetailItem> = schema((path) => {
    required(path.remarks, { message: 'Remarks are required for action' });
  });

  protected readonly leaveApprovalForm = form(this.leaveApprovalModel, this.leaveApprovalSchema);

  constructor() {
    this.dateAdapter.setLocale('en-GB');

    effect(() => {
      this.leaveRequestStore.setLeaveRequestId(this.leaveApprovalId());
    });

    effect(() => {
      const request = this.leaveApproval();
      if (request) {
        this.leaveApprovalModel.set({
          id: request.id,
          employeeName: request.employeeName,
          leaveType: request.leaveType,
          fromDate: request.fromDate ? new Date(request.fromDate) : null,
          toDate: request.toDate ? new Date(request.toDate) : null,
          reason: request.reason || '',
          address: request.address || '',
          remarks: '',
        });
        this.documentUrl.set(request.enclosedDocUrl || '');
      }
    });
  }

  protected updateField<K extends keyof ILeaveApprovalDetailItem>(
    field: K,
    value: ILeaveApprovalDetailItem[K],
  ) {
    this.leaveApprovalModel.update((current) => ({
      ...current,
      [field]: value,
    }));
  }

  openDocument() {
    if (!this.documentUrl() || !this.documentName()) {
      return;
    }

    this.documentModal.open({
      url: this.documentUrl(),
      documentName: this.documentName(),
      extension: this.documentName().split('.').pop()?.toLowerCase() || '',
      downloadAccess: true,
    });
  }

  protected onCancelClicked() {
    this.cancel.emit();
  }

  protected onAction(action: 'approve' | 'reject' | 'recommend') {
    if (!this.leaveApprovalForm().valid()) {
      this.leaveApprovalForm().markAsTouched();
      return;
    }

    const dataToSave = this.leaveApprovalForm().value();
    // Simulate action execution
    if (action === 'approve') this.approve.emit();
    if (action === 'reject') this.reject.emit();
    if (action === 'recommend') this.recommend.emit();

    this.leaveApprovalStore.refreshList();
  }
}
