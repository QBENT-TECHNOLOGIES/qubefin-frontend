import { Component, output, signal, inject, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { LucideDynamicIcon } from '@lucide/angular';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { form, FormField, required, Schema, schema } from '@angular/forms/signals';
import { AttendanceService } from '../../../services/attendance-service';
import { MatIconModule } from '@angular/material/icon';
import { AttendanceRegularizationsStore } from '../../../stores/attendance-regularizations-store';
import { IRegularizationForm } from '../../../models/attendance-regularization';
import { AlertService } from 'qubefin-core';
import { MatChipsModule } from '@angular/material/chips';
@Component({
  selector: 'qfin-attendance-regularization-apply',
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    LucideDynamicIcon,
    MatIconModule,
    FormField,
    MatChipsModule,
  ],
  providers: [provideNativeDateAdapter(), DatePipe],
  templateUrl: './attendance-regularization-apply.html',
  styles: ``,
})
export class AttendanceRegularizationApply {
  private readonly alertService = inject(AlertService);
  private readonly attendanceService = inject(AttendanceService);
  private readonly dateAdapter = inject(DateAdapter<Date>);
  private readonly datePipe = inject(DatePipe);
  private readonly store = inject(AttendanceRegularizationsStore);
  readonly cancel = output<void>();
  readonly save = output<void>();

  readonly regularizationTypes = signal<string[]>(['ATTENDANCE', 'ONDUTY']);

  readonly formModel = signal<IRegularizationForm>({
    regularizationType: '',
    reason: '',
    regularizationDates: [],
    remarks: '',
  });

  protected readonly formSchema: Schema<IRegularizationForm> = schema((path) => {
    required(path.regularizationType, { message: 'Regularization Type is required' });
    required(path.regularizationDates, { message: 'At least one date is required' });
  });
  readonly maxDate = new Date();
  readonly minDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
  protected readonly applyForm = form(this.formModel, this.formSchema);

  protected readonly selectedFile = signal<File | null>(null);
  public readonly documentUrl = signal<string>('');
  public readonly documentName = signal<string>('');

  constructor() {
    this.dateAdapter.setLocale('en-GB');
  }

  updateType(regularizationType: string) {
    this.formModel.update((m) => {
      const newDates: Date[] = [];
      const updatedReason = '';
      return {
        ...m,
        regularizationType,
        regularizationDates: newDates,
        reason: updatedReason,
      };
    });
  }

  onDateSelected(event: any, inputElement: HTMLInputElement) {
    const selectedDate = event.value;
    if (!selectedDate) return;

    this.formModel.update((m) => {
      if (m.regularizationType === 'ATTENDANCE') {
        return { ...m, regularizationDates: [selectedDate] };
      } else {
        const exists = m.regularizationDates.some((d) => d.getTime() === selectedDate.getTime());
        if (!exists) {
          return { ...m, regularizationDates: [...m.regularizationDates, selectedDate] };
        }
        return m;
      }
    });

    inputElement.value = '';
  }

  removeDate(index: number) {
    this.formModel.update((m) => {
      const newDates = [...m.regularizationDates];
      newDates.splice(index, 1);
      return { ...m, regularizationDates: newDates };
    });
  }

  onFileSelected(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    const file = inputElement.files?.[0];

    if (file) {
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      if (!isImage && !isPdf) {
        this.alertService.error('Invalid File', 'Please upload only Image or PDF files.');
        inputElement.value = '';
        return;
      }
      this.selectedFile.set(file);
      this.documentUrl.set(URL.createObjectURL(file));
      this.documentName.set(file.name);
    }
  }
  openDocument() {
    const url = this.documentUrl();
    window.open(url, '_blank');
  }
  removeFile() {
    this.selectedFile.set(null);
    if (this.documentUrl().startsWith('blob:')) {
      URL.revokeObjectURL(this.documentUrl());
    }
    this.documentUrl.set('');
    this.documentName.set('');
  }

  onCancelClicked() {
    this.cancel.emit();
  }
  readonly reasons = computed(() => {
    const list = this.store.utilities();
    return list.length > 0 ? list.filter((m: any) => m.sysKey === 'REGULARIZATION') : [];
  });

  onSubmit() {
    if (!this.applyForm().valid()) {
      return;
    }
    const data = this.formModel();
    if (!data.regularizationDates || data.regularizationDates.length === 0) {
      this.alertService.warning('Warning', 'Please select at least one date from the calendar.');
      return;
    }
    const formData = new FormData();
    formData.append('regularizationType', data.regularizationType);
    if (data.reason) {
      formData.append('reason', data.reason);
    }
    data.regularizationDates.forEach((d) => {
      const formatted = this.datePipe.transform(d, 'yyyy-MM-dd');
      if (formatted) {
        formData.append('regularizationDates', formatted);
      }
    });

    if (this.selectedFile()) {
      formData.append('attachment', this.selectedFile() as Blob);
    }
    if (data.remarks) {
      formData.append('remarks', data.remarks);
    }
    this.alertService
      .confirm('Confirmation', 'Do you want to apply regularization?', 'Yes', 'No')
      .then((result: any) => {
        if (result.isConfirmed) {
          this.attendanceService.applyRegularization(formData).subscribe({
            next: (resp: any) => {
              this.alertService.success('Success', resp).then(() => {
                this.store.refreshList();
                this.save.emit();
              });
            },
            error: (err: any) => {},
          });
        }
      });
  }
}
