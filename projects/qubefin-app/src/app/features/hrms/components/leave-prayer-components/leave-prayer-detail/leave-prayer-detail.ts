import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { form, FormField, required, schema, Schema } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideDynamicIcon } from '@lucide/angular';
import { LeaveRequestStore } from '../../../stores/leave-request-store';
import { LeaveRequestService } from '../../../services/leave-request-service';
import { DocumentModalService } from '../../../../../shared/services/document-modal.service';
import { EMPTY_UUID } from '../../../../../../../../../dist/qubefin-core/types/qubefin-core';
import { ILeaveRequestDetailItem } from '../../../models/leave-request';

@Component({
  selector: 'qfin-leave-prayer-detail',
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
  templateUrl: './leave-prayer-detail.html',
  styles: ``,
})
export class LeavePrayerDetail {
  private readonly leaveRequestStore = inject(LeaveRequestStore);
  private readonly leaveRequestService = inject(LeaveRequestService);
  private readonly dateAdapter = inject(DateAdapter<Date>);
  readonly documentModal = inject(DocumentModalService);
  private readonly datePipe = inject(DatePipe);

  readonly leaveRequestId = input<string>(EMPTY_UUID);

  readonly cancel = output<void>();
  readonly save = output<void>();

  readonly isEditMode = computed(
    () => !!this.leaveRequestId() && this.leaveRequestId() !== EMPTY_UUID,
  );

  readonly leaveRequest = this.leaveRequestStore.leaveRequest;
  readonly loading = this.leaveRequestStore.leaveRequestLoading;

  readonly leaveTypeOptions = [
    'Sick Leave',
    'Casual Leave',
    'Earned Leave',
    'Maternity Leave',
    'Paternity Leave',
  ];

  protected readonly selectedFile = signal<File | null>(null);

  public readonly documentUrl = signal<string>('');
  public readonly documentName = signal<string>('');

  protected readonly leaveRequestModel = signal<ILeaveRequestDetailItem>({
    id: EMPTY_UUID,
    leaveTypeId: '',
    fromDate: '',
    toDate: '',
    reason: '',
    address: '',
  });

  protected readonly leaveRequestSchema: Schema<ILeaveRequestDetailItem> = schema((path) => {
    required(path.leaveTypeId, { message: 'Leave Type is required' });
    required(path.fromDate, { message: 'From Date is required' });
    required(path.toDate, { message: 'To Date is required' });
    required(path.reason, { message: 'Reason is required' });
  });

  protected readonly leaveRequestForm = form(this.leaveRequestModel, this.leaveRequestSchema);

  constructor() {
    this.dateAdapter.setLocale('en-GB');

    effect(() => {
      this.leaveRequestStore.setLeaveRequestId(this.leaveRequestId());

      if (!this.isEditMode()) {
        this.leaveRequestModel.set({
          id: EMPTY_UUID,
          leaveTypeId: '',
          fromDate: '',
          toDate: '',
          reason: '',
          address: '',
        });
        this.selectedFile.set(null);
        this.documentUrl.set('');
        this.documentName.set('');
        return;
      }
    });

    effect(() => {
      const request = this.leaveRequest();
      if (request) {
        this.leaveRequestModel.set({
          ...request,
          fromDate: request.fromDate ? new Date(request.fromDate) : null,
          toDate: request.toDate ? new Date(request.toDate) : null,
        });
        // this.documentUrl.set(request.documentUrl || '');
        // this.documentName.set(request.documentName || '');
      }
    });
  }

  protected updateField<K extends keyof ILeaveRequestDetailItem>(
    field: K,
    value: ILeaveRequestDetailItem[K],
  ) {
    this.leaveRequestModel.update((current) => ({
      ...current,
      [field]: value,
    }));
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.selectedFile.set(file);
      this.documentUrl.set(URL.createObjectURL(file));
      this.documentName.set(file.name);
    }
  }

  removeFile() {
    this.selectedFile.set(null);
    if (this.documentUrl().startsWith('blob:')) {
      URL.revokeObjectURL(this.documentUrl());
    }
    // this.documentUrl.set(this.leaveRequest()?.documentUrl || '');
    // this.documentName.set(this.leaveRequest()?.documentName || '');
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

  protected onSubmit() {
    if (!this.leaveRequestForm().valid()) {
      return;
    }

    const dataToSave = this.leaveRequestForm().value();

    const formData = new FormData();
    formData.append('leaveType', dataToSave.leaveTypeId);

    const fromDateStr = this.datePipe.transform(dataToSave.fromDate, 'yyyy-MM-dd');
    const toDateStr = this.datePipe.transform(dataToSave.toDate, 'yyyy-MM-dd');
    if (fromDateStr) formData.append('fromDate', fromDateStr);
    if (toDateStr) formData.append('toDate', toDateStr);

    formData.append('reason', dataToSave.reason || '');
    formData.append('address', dataToSave.address || '');

    if (this.selectedFile()) {
      formData.append('document', this.selectedFile() as Blob);
    }

    // if (!this.isEditMode()) {
    //   this.leaveRequestService.create(formData).subscribe({
    //     next: () => {
    //       this.leaveRequestStore.refreshList();
    //       this.save.emit();
    //     },
    //   });
    //   return;
    // }
  }
}
