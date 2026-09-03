import { Component, output, signal, inject, computed, effect } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { LucideDynamicIcon } from '@lucide/angular';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { form, FormField, readonly, required, Schema, schema } from '@angular/forms/signals';
import { AttendanceService } from '../../../services/attendance-service';
import { MatIconModule } from '@angular/material/icon';
import { AttendanceRegularizationsStore } from '../../../stores/attendance-regularizations-store';
import { IRegularizationForm } from '../../../models/attendance-regularization';
import { AlertService } from 'qubefin-core';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { DocumentModalService } from 'qubefin-core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import { TimePickerDialogComponent } from 'qubefin-core';
import { MatRadioModule } from '@angular/material/radio';

@Component({
  selector: 'qfin-attendance-regularization-apply',
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    LucideDynamicIcon,
    MatIconModule,
    FormField,
    MatChipsModule,
    MatDialogModule,
    MatListModule,
    MatRadioModule,
  ],
  providers: [provideNativeDateAdapter(), DatePipe],
  templateUrl: './attendance-regularization-apply.html',
  styles: ``,
})
export class AttendanceRegularizationApply {
  private readonly alertService = inject(AlertService);
  private readonly attendanceService = inject(AttendanceService);
  readonly documentModal = inject(DocumentModalService);
  private readonly dialog = inject(MatDialog);

  private readonly dateAdapter = inject(DateAdapter<Date>);
  private readonly datePipe = inject(DatePipe);
  private readonly store = inject(AttendanceRegularizationsStore);
  readonly cancel = output<void>();
  readonly save = output<void>();

  readonly regularizationTypes = signal<string[]>(['ATTENDANCE', 'ONDUTY']);
  readonly timeSelectionMode = signal<'inTime' | 'outTime' | 'both'>('both');

  readonly formModel = signal<IRegularizationForm>({
    regularizationType: '',
    reason: '',
    regularizationDates: [],
    actualInTime: null,
    actualOutTime: null,
    remarks: '',
  });

  protected readonly formSchema: Schema<IRegularizationForm> = schema((path) => {
    required(path.regularizationType, { message: 'Regularization Type is required' });
    required(path.regularizationDates, { message: 'At least one date is required' });
    readonly(path.regularizationDates, { when: () => true });

    required(path.reason, {
      message: 'Reason is required',
      when: () => this.formModel().regularizationType === 'ATTENDANCE',
    });

    required(path.actualInTime, {
      message: 'In Time is required',
      when: () =>
        this.formModel().regularizationType === 'ATTENDANCE' &&
        (this.timeSelectionMode() === 'inTime' || this.timeSelectionMode() === 'both'),
    });
    required(path.actualOutTime, {
      message: 'Out Time is required',
      when: () =>
        this.formModel().regularizationType === 'ATTENDANCE' &&
        (this.timeSelectionMode() === 'outTime' || this.timeSelectionMode() === 'both'),
    });
  });
  public maxDate = new Date();
  readonly minDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  protected readonly applyForm = form(this.formModel, this.formSchema);

  protected readonly selectedFile = signal<File | null>(null);
  public readonly documentUrl = signal<string>('');
  public readonly documentName = signal<string>('');

  constructor() {
    this.dateAdapter.setLocale('en-GB');
    effect(() => {
      const today = new Date();
      const lastWorkingDay = this.store.lastWorkingDay();

      this.maxDate =
        lastWorkingDay && new Date(lastWorkingDay).toDateString() === today.toDateString()
          ? today
          : new Date(today.setDate(today.getDate() - 1));
    });
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
        actualInTime: null,
        actualOutTime: null,
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

  onTimeSelectionModeChange(mode: 'inTime' | 'outTime' | 'both') {
    this.timeSelectionMode.set(mode);
    // Clear time fields when switching modes
    if (mode === 'inTime') {
      this.formModel.update((m) => ({ ...m, actualOutTime: null }));
    } else if (mode === 'outTime') {
      this.formModel.update((m) => ({ ...m, actualInTime: null }));
    }
  }

  readonly isInTimeRequired = computed(() => {
    const mode = this.timeSelectionMode();
    return mode === 'inTime' || mode === 'both';
  });

  readonly isOutTimeRequired = computed(() => {
    const mode = this.timeSelectionMode();
    return mode === 'outTime' || mode === 'both';
  });

  readonly isInTimeDisabled = computed(() => {
    const mode = this.timeSelectionMode();
    return mode === 'outTime';
  });

  readonly isOutTimeDisabled = computed(() => {
    const mode = this.timeSelectionMode();
    return mode === 'inTime';
  });
  readonly reasons = computed(() => {
    const list = this.store.utilities();
    return list.length > 0 ? list.filter((m: any) => m.sysKey === 'REGULARIZATION') : [];
  });

  private normalizeTimeValue(value: string | Date | null): string | null {
    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      // Handle 12-hour format: 02:30 PM
      if (value.includes('AM') || value.includes('PM')) {
        const parts = value.trim().split(/\s+/);
        const timeParts = parts[0].split(':');

        let hour = parseInt(timeParts[0], 10);
        const minute = parseInt(timeParts[1] ?? '0', 10);
        const period = parts[1]?.toUpperCase();

        if (period === 'PM' && hour !== 12) {
          hour += 12;
        }

        if (period === 'AM' && hour === 12) {
          hour = 0;
        }

        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
      }

      // Handle HH:mm or HH:mm:ss
      const timeParts = value.split(':');

      const hour = String(timeParts[0]).padStart(2, '0');
      const minute = String(timeParts[1] ?? '0').padStart(2, '0');
      const second = String(timeParts[2] ?? '0').padStart(2, '0');

      return `${hour}:${minute}:${second}`;
    }

    // Date object
    return this.datePipe.transform(value, 'HH:mm:ss') ?? null;
  }

  onInTimeChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.formModel.update((m) => {
      return { ...m, actualInTime: input.value || null };
    });
  }

  onOutTimeChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.formModel.update((m) => {
      return { ...m, actualOutTime: input.value || null };
    });
  }

  openInTimePicker() {
    if (this.isInTimeDisabled()) return;
    this.openTimePicker('In Time', this.formModel().actualInTime as string, (time: string) => {
      this.formModel.update((m) => ({ ...m, actualInTime: time }));
    });
  }

  openOutTimePicker() {
    if (this.isOutTimeDisabled()) return;
    this.openTimePicker('Out Time', this.formModel().actualOutTime as string, (time: string) => {
      this.formModel.update((m) => ({ ...m, actualOutTime: time }));
    });
  }

  private openTimePicker(title: string, currentTime: string, callback: (time: string) => void) {
    // Parse current time (format: "HH:mm" or "HH:mm AM/PM")
    let currentHour = 12;
    let currentMinute = 0;
    let currentPeriod: 'AM' | 'PM' = 'AM';

    if (currentTime) {
      const parts = currentTime.split(' ');
      const timeParts = parts[0].split(':');
      currentHour = parseInt(timeParts[0], 10) || 12;
      currentMinute = parseInt(timeParts[1], 10) || 0;
      if (parts[1]) {
        currentPeriod = parts[1] as 'AM' | 'PM';
      } else {
        // Convert 24-hour to 12-hour format
        currentPeriod = currentHour >= 12 ? 'PM' : 'AM';
        currentHour = currentHour % 12 || 12;
      }
    }

    const dialogRef = this.dialog.open(TimePickerDialogComponent, {
      width: '340px',
      maxWidth: '95vw',
      panelClass: 'custom-time-picker-dialog',
      data: { title, currentHour, currentMinute, currentPeriod },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.formatted) {
        callback(result.formatted);
      }
    });
  }

  onSubmit() {
    this.applyForm().markAsTouched();
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

    const actualInTime = this.normalizeTimeValue(data.actualInTime);
    const actualOutTime = this.normalizeTimeValue(data.actualOutTime);

    if (actualInTime) {
      formData.append('actualInTime', actualInTime);
    }
    if (actualOutTime) {
      formData.append('actualOutTime', actualOutTime);
    }
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
