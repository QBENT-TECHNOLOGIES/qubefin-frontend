import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService } from 'qubefin-core';
import { CandidateService } from '../../../../services/candidate-service';
import { openTimePicker, toApiDate, toApiTime, toDisplayTime, toLocalDate } from '../../interview-time';

export interface IScheduleInterviewDialogData {
  candidateId: string;
  candidateName: string;
  interviewDate: string | null;
  interviewTime: string | null;
}

/** Schedule action of the candidate list: adds or updates the interview date and time only. It creates no
 * panel, interviewer or interview letter. Closes with `true` once saved. */
@Component({
  selector: 'qfin-schedule-interview-dialog',
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    LucideDynamicIcon,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './schedule-interview-dialog.html',
})
export class ScheduleInterviewDialog {
  private readonly dialogRef = inject(MatDialogRef<ScheduleInterviewDialog>);
  private readonly dialog = inject(MatDialog);
  private readonly candidateService = inject(CandidateService);
  private readonly alertService = inject(AlertService);
  protected readonly data = inject<IScheduleInterviewDialogData>(MAT_DIALOG_DATA);

  protected readonly isReschedule = !!this.data.interviewDate;
  protected readonly today = new Date(new Date().setHours(0, 0, 0, 0));
  protected readonly interviewDate = signal<Date | ''>(toLocalDate(this.data.interviewDate));
  protected readonly interviewTime = signal<string>(toDisplayTime(this.data.interviewTime));
  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);

  constructor() {
    inject(DateAdapter<Date>).setLocale('en-GB');
  }

  protected openTimePicker() {
    openTimePicker(this.dialog, 'Interview Time', this.interviewTime(), (time) => this.interviewTime.set(time));
  }

  protected onSave() {
    this.submitted.set(true);
    const date = toApiDate(this.interviewDate() || null);
    const time = toApiTime(this.interviewTime());
    if (!date || !time || this.saving()) return;

    this.saving.set(true);
    this.candidateService.scheduleInterview(this.data.candidateId, date, time).subscribe({
      next: (resp: any) => {
        this.saving.set(false);
        this.alertService.success('Success', resp);
        this.dialogRef.close(true);
      },
      error: () => this.saving.set(false),
    });
  }

  protected onCancel() {
    this.dialogRef.close(false);
  }
}
