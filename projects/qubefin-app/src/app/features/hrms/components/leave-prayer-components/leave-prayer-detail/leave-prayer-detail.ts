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
import { DocumentModalService } from '../../../../../shared/services/document-modal.service';
import { LeavePrayerStore } from '../../../stores/leave-prayer-store';
import { ILeavePrayerDetailItem } from '../../../models/leave-prayer';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import { LeavePrayerService } from '../../../services/leave-prayer-service';
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
  private readonly leavePrayerStore = inject(LeavePrayerStore);
  private readonly leavePrayerService = inject(LeavePrayerService);
  private readonly dateAdapter = inject(DateAdapter<Date>);
  readonly documentModal = inject(DocumentModalService);
  private readonly datePipe = inject(DatePipe);
  private readonly alertService = inject(AlertService);
  readonly leavePrayerId = input<string>(EMPTY_UUID);

  readonly cancel = output<void>();
  readonly save = output<void>();

  readonly isEditMode = computed(
    () => !!this.leavePrayerId() && this.leavePrayerId() !== EMPTY_UUID,
  );

  readonly leavePrayer = this.leavePrayerStore.leavePrayer;
  readonly loading = this.leavePrayerStore.leavePrayerLoading;

  readonly leaveTypeBalances = this.leavePrayerStore.leaveTypeBalances;
  readonly leaveTypeBalancesLoading = this.leavePrayerStore.leaveTypeBalancesLoading;

  protected readonly selectedFile = signal<File | null>(null);
  protected readonly isNoOfDaysDisabled = signal(false);
  public readonly documentUrl = signal<string>('');
  public readonly documentName = signal<string>('');

  protected readonly leavePrayerModel = signal<ILeavePrayerDetailItem>({
    id: EMPTY_UUID,
    leaveTypeId: '',
    prayerDays: 0,
    remarks: '',
  });

  protected readonly leavePrayerSchema: Schema<ILeavePrayerDetailItem> = schema((path) => {
    required(path.leaveTypeId, { message: 'Leave Type is required' });
    required(path.prayerDays, { message: 'Prayer Days is required' });
  });

  protected readonly leavePrayerForm = form(this.leavePrayerModel, this.leavePrayerSchema);

  constructor() {
    this.dateAdapter.setLocale('en-GB');

    effect(() => {
      this.leavePrayerStore.setLeaveRequestId(this.leavePrayerId());
    });
  }
  updateType(leedTypeId: string) {
    const leaves = this.leaveTypeBalances();
    const selectedLeaveBalance = leaves.find((m) => m.leaveTypeId === leedTypeId);
    if (selectedLeaveBalance?.alias === 'PL' || selectedLeaveBalance?.alias === 'MML') {
      this.leavePrayerModel.update((current) => ({
        ...current,
        prayerDays: selectedLeaveBalance?.leaveBalance,
      }));
      this.isNoOfDaysDisabled.set(true);
    } else {
      this.isNoOfDaysDisabled.set(false);
    }
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
    this.documentUrl.set(this.leavePrayer()?.documentUrl || '');
    this.documentName.set(this.leavePrayer()?.documentName || '');
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
    if (!this.leavePrayerForm().valid()) {
      return;
    }
    // if (!this.selectedFile()) {
    //   this.alertService.warning(null, 'Please select a file to upload.');
    //   return;
    // }
    const dataToSave = this.leavePrayerForm().value();

    const formData = new FormData();
    formData.append('leaveTypeId', dataToSave.leaveTypeId);
    formData.append('prayerDays', dataToSave.prayerDays?.toString());
    formData.append('remarks', dataToSave.remarks || '');
    if (this.selectedFile()) {
      formData.append('attachment', this.selectedFile() as Blob);
    }

    this.alertService
      .confirm('Confirmation', `Do you want to apply your leave prayer?`, 'Yes', 'No')
      .then((result: any) => {
        if (result.isConfirmed) {
          this.leavePrayerService.save(formData).subscribe({
            next: (resp: any) => {
              if (resp.value && resp.value.success) {
                this.alertService.success('Success', resp.message).then(() => {
                  this.leavePrayerStore.refreshList();
                  this.save.emit();
                });
              } else {
                this.alertService.error('Failed', resp.message);
              }
            },
            error: (err: any) => {
              this.alertService.error('Failed', err.error.message);
            },
          });
        }
      });
  }
}
