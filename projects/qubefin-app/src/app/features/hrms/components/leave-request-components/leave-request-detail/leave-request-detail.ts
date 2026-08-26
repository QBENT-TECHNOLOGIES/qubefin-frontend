import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { form, FormField, readonly, required, schema, Schema } from '@angular/forms/signals';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import { LeaveRequestStore } from '../../../stores/leave-request-store';
import { LeaveRequestService } from '../../../services/leave-request-service';
import { LucideDynamicIcon } from '@lucide/angular';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { ILeaveRequestDetailItem } from '../../../models/leave-request';
import { DocumentModalService } from '../../../../../shared/services/document-modal.service';

@Component({
  selector: 'qfin-leave-request-detail',
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
  templateUrl: './leave-request-detail.html',
  styles: ``,
})
export class LeaveRequestDetail {
  private readonly leaveRequestStore = inject(LeaveRequestStore);
  private readonly leaveRequestService = inject(LeaveRequestService);
  private readonly alertService = inject(AlertService);
  private readonly dateAdapter = inject(DateAdapter<Date>);
  readonly documentModal = inject(DocumentModalService);
  private readonly datePipe = inject(DatePipe);

  readonly leaveRequestId = input<string>(EMPTY_UUID);

  readonly cancel = output<void>();
  readonly save = output<string | void>();

  readonly isEditMode = computed(
    () => !!this.leaveRequestId() && this.leaveRequestId() !== EMPTY_UUID,
  );

  readonly leaveRequest = this.leaveRequestStore.leaveRequest;
  readonly loading = this.leaveRequestStore.leaveRequestLoading;

  readonly leaveTypeBalances = this.leaveRequestStore.leaveTypeBalances;
  readonly leaveTypeBalancesLoading = this.leaveRequestStore.leaveTypeBalancesLoading;

  protected readonly selectedFile = signal<File | null>(null);
  private previousFromDate: Date | null = null;
  public readonly documentUrl = signal<string>('');
  public readonly documentName = signal<string>('');
  public readonly minDate = signal<Date>(new Date());

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
    readonly(path.fromDate, { when: () => true });
    readonly(path.toDate, { when: () => true });
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
        this.documentUrl.set(request.enclosedDocUrl || '');
        this.documentName.set(request.enclosedDocName || '');
      }
    });

    effect(() => {
      const value = this.leaveRequestForm.fromDate().value();

      if (!value) {
        this.previousFromDate = null;
        return;
      }

      const fromDate = value instanceof Date ? value : new Date(value);

      // Skip initial load (Create/Edit)
      if (this.previousFromDate === null) {
        this.previousFromDate = fromDate;
        return;
      }

      // Clear To Date only when From Date actually changes
      if (this.previousFromDate.getTime() !== fromDate.getTime()) {
        this.updateField('toDate', null);
      }

      this.previousFromDate = fromDate;
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
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/gif',
      'image/webp',
    ];

    if (!allowedTypes.includes(file.type)) {
      // Show your Swal/toast message here
      input.value = '';
      this.alertService.warning(null, 'Only image/PDF file can be selected.');
      return;
    }

    this.selectedFile.set(file);
    this.documentUrl.set(URL.createObjectURL(file));
    this.documentName.set(file.name);
  }

  removeFile() {
    this.selectedFile.set(null);
    if (this.documentUrl().startsWith('blob:')) {
      URL.revokeObjectURL(this.documentUrl());
    }
    this.documentUrl.set(this.leaveRequest()?.enclosedDocUrl || '');
    this.documentName.set(this.leaveRequest()?.enclosedDocName || '');
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

  private buildFormData(): FormData {
    const dataToSave = this.leaveRequestForm().value();
    const formData = new FormData();
    if (this.isEditMode()) {
      formData.append('id', dataToSave.id);
    }
    formData.append('leaveTypeId', dataToSave.leaveTypeId);

    const fromDateStr = this.datePipe.transform(dataToSave.fromDate, 'yyyy-MM-dd');
    const toDateStr = this.datePipe.transform(dataToSave.toDate, 'yyyy-MM-dd');
    if (fromDateStr) formData.append('fromDate', fromDateStr);
    if (toDateStr) formData.append('toDate', toDateStr);

    formData.append('reason', dataToSave.reason || '');
    formData.append('address', dataToSave.address || '');

    if (this.selectedFile()) {
      formData.append('enclosedFileName', this.selectedFile()?.name || '');
      formData.append('enclosedFile', this.selectedFile() as Blob);
    }
    return formData;
  }

  protected onSaveAsDraft() {
    if (!this.leaveRequestForm().valid()) {
      return;
    }

    this.alertService
      .confirm(
        'Confirmation',
        `Do you want to ${this.isEditMode() ? 'update' : 'create'} your leave request?`,
        'Yes',
        'No',
      )
      .then((result: any) => {
        if (result.isConfirmed) {
          const formData = this.buildFormData();

          this.leaveRequestService.save(formData).subscribe({
            next: (resp: any) => {
              this.alertService.success('Success', resp).then(() => {
                this.leaveRequestStore.refreshList();
                this.save.emit();
              });
            },
            error: (err: any) => {},
          });
        }
      });
  }
}
