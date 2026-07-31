import { Component, output, signal, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { LucideDynamicIcon } from '@lucide/angular';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import Swal from 'sweetalert2';
import { form, required, Schema, schema } from '@angular/forms/signals';
import { AttendanceService } from '../../../services/attendance-service';
import { MatIconModule } from '@angular/material/icon';

export interface IRegularizationForm {
  regularizationType: string;
  reason: string;
  regularizationDates: Date[];
}

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
  ],
  providers: [provideNativeDateAdapter(), DatePipe],
  templateUrl: './attendance-regularization-apply.html',
  styles: ``,
})
export class AttendanceRegularizationApply {
  private readonly attendanceService = inject(AttendanceService);
  private readonly dateAdapter = inject(DateAdapter<Date>);
  private readonly datePipe = inject(DatePipe);
  // readonly documentModal = inject(DocumentModalService);

  readonly cancel = output<void>();
  readonly save = output<void>();

  readonly regularizationTypes = signal<string[]>(['ATTENDANCE', 'ONDUTY']);
  readonly reasons = signal<string[]>([
    'Forgot to punch',
    'Biometric issue',
    'System error',
    'Client visit',
    'Work from home',
    'Other',
  ]);

  readonly formModel = signal<IRegularizationForm>({
    regularizationType: '',
    reason: '',
    regularizationDates: [],
  });

  protected readonly formSchema: Schema<IRegularizationForm> = schema((path) => {
    required(path.regularizationType, { message: 'Regularization Type is required' });
    required(path.reason, { message: 'Reason is required' });
    required(path.regularizationDates, { message: 'At least one date is required' });
  });

  protected readonly applyForm = form(this.formModel, this.formSchema);

  protected readonly selectedFile = signal<File | null>(null);
  public readonly documentUrl = signal<string>('');
  public readonly documentName = signal<string>('');

  constructor() {
    this.dateAdapter.setLocale('en-GB');
  }

  updateType(regularizationType: string) {
    this.formModel.update((m) => {
      const newDates =
        regularizationType === 'ATTENDANCE' && m.regularizationDates.length > 1
          ? [m.regularizationDates[0]]
          : m.regularizationDates;
      return { ...m, regularizationType, regularizationDates: newDates };
    });
  }

  updateReason(reason: string) {
    this.formModel.update((m) => ({ ...m, reason }));
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

    if (this.formModel().regularizationType === 'ONDUTY') {
      inputElement.value = '';
    }
  }

  removeDate(index: number) {
    this.formModel.update((m) => {
      const newDates = [...m.regularizationDates];
      newDates.splice(index, 1);
      return { ...m, regularizationDates: newDates };
    });
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
    this.documentUrl.set('');
    this.documentName.set('');
  }

  // openDocument() {
  //   if (!this.documentUrl() || !this.documentName()) return;

  //   this.documentModal.open({
  //     url: this.documentUrl(),
  //     documentName: this.documentName(),
  //     extension: this.documentName().split('.').pop()?.toLowerCase() || '',
  //     downloadAccess: true,
  //   });
  // }

  onCancelClicked() {
    this.cancel.emit();
  }

  onSubmit() {
    if (!this.applyForm().valid()) {
      return;
    }

    const data = this.formModel();

    const formData = new FormData();
    formData.append('regularizationType', data.regularizationType);
    formData.append('reason', data.reason);

    data.regularizationDates.forEach((d) => {
      const formatted = this.datePipe.transform(d, 'yyyy-MM-dd');
      if (formatted) {
        formData.append('regularizationDates', formatted);
      }
    });

    if (this.selectedFile()) {
      formData.append('attachment', this.selectedFile() as Blob);
    }

    Swal.fire({
      title: 'Are you sure?',
      text: `You are applying regularization.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, Apply',
    }).then((result) => {
      if (result.isConfirmed) {
        this.attendanceService.applyRegularization(formData).subscribe((resp: any) => {
          Swal.fire('Success!', resp.message, 'success').then(() => {
            this.save.emit();
          });
        });
      }
    });
  }
}
