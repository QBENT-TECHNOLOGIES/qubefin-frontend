import { Component, output, signal, inject, computed } from '@angular/core';
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
import { AttendanceRegularizationsStore } from '../../../stores/attendance-regularizations-store';

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
  private readonly store = inject(AttendanceRegularizationsStore);
  readonly cancel = output<void>();
  readonly save = output<void>();

  readonly regularizationTypes = signal<string[]>(['ATTENDANCE', 'ONDUTY']);

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
      const newDates =
        regularizationType === 'ATTENDANCE' && m.regularizationDates.length > 1
          ? [m.regularizationDates[0]]
          : m.regularizationDates;
      const updatedReason = '';

      return { ...m, regularizationType, regularizationDates: newDates, reason: updatedReason };
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
  readonly reasons = computed(() => {
    const list = this.store.utilities();
    return list.length > 0 ? list.filter((m: any) => m.sysKey === 'REGULARIZATION') : [];
  });

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

    // Swal.fire({
    //   title: 'Are you sure?',
    //   text: `You are applying regularization.`,
    //   icon: 'question',
    //   showCancelButton: true,
    //   confirmButtonColor: '#3085d6',
    //   cancelButtonColor: '#d33',
    //   confirmButtonText: 'Yes, Apply',
    // }).then((result) => {
    //   if (result.isConfirmed) {
    this.attendanceService.applyRegularization(formData).subscribe((resp: any) => {
      Swal.fire({
        html: `
                  <div class="alert-icon-wrapper success">
                    <div class="confetti c1"></div>
                    <div class="confetti c2"></div>
                    <div class="confetti c3"></div>
                    <div class="confetti c4"></div>
                    <div class="confetti c5"></div>
                    <div class="circle-outer success-outer">
                      <div class="circle-inner success-inner">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                          <path d="M5 13l4 4L19 7" stroke="white" stroke-width="3"
                            stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                  <h2 class="swal-title">Success!</h2>
                  <p class="swal-text">${resp.message}</p>
              <svg viewBox="0 0 1440 320" class="btm-svg">
                <path fill="#2fae59" fill-opacity="0.1" d="M0,96L34.3,122.7C68.6,149,137,203,206,240C274.3,277,343,299,411,298.7C480,299,549,277,617,272C685.7,267,754,277,823,272C891.4,267,960,245,1029,213.3C1097.1,181,1166,139,1234,117.3C1302.9,96,1371,96,1406,96L1440,96L1440,320L1405.7,320C1371.4,320,1303,320,1234,320C1165.7,320,1097,320,1029,320C960,320,891,320,823,320C754.3,320,686,320,617,320C548.6,320,480,320,411,320C342.9,320,274,320,206,320C137.1,320,69,320,34,320L0,320Z"></path>
              </svg>
                `,
        showConfirmButton: true,
        confirmButtonText: 'Ok',
        reverseButtons: true,
        buttonsStyling: false,
        customClass: {
          popup: 'swal-popup swal-popup-success',
          confirmButton: 'swal-btn swal-btn-success',
          actions: 'swal-actions',
        },
      }).then(() => {
        this.save.emit();
      });
    });
    //   }
    // });
  }
}
