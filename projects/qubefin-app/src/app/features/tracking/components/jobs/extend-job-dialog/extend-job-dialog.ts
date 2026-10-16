import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LucideDynamicIcon } from '@lucide/angular';
import { DatePipe } from '@angular/common';
import { ExtendJobRequest, Job } from '../../../models/job';
import { toDateKey } from '../../../utils/geo-utils';

@Component({
  selector: 'qfin-extend-job-dialog',
  imports: [DatePipe, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, LucideDynamicIcon],
  template: `
    <div class="trk-dialog-header">
      <div class="flex items-center gap-4">
        <div class="trk-dialog-icon bg-amber-50 text-amber-600 dark:bg-secondary-600/50 dark:text-amber-400">
          <svg lucideIcon="calendar-plus" class="w-6 h-6"></svg>
        </div>
        <div>
          <h2 class="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">Extend {{ job.jobNo }}</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Currently due {{ job.completeBy | date: 'EEE, dd MMM yyyy' }} · {{ job.openCount }} task(s) pending</p>
        </div>
      </div>
      <button type="button" (click)="cancel()" class="trk-dialog-close" aria-label="Close"><svg lucideIcon="x" class="w-5 h-5"></svg></button>
    </div>
    <div class="p-5 flex flex-col gap-4 w-[min(460px,90vw)] trk-form">
      <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-full">
        <mat-label>New complete-by date</mat-label>
        <div class="w-12 flex justify-center" matPrefix><svg lucideIcon="calendar-days" class="w-5 h-5"></svg></div>
        <input matInput type="date" [min]="minDate" [ngModel]="date()" (ngModelChange)="date.set($event)" />
      </mat-form-field>
      @if (submitted() && !dateOk()) {
        <p class="trk-field-error -mt-2">Choose a date after {{ job.completeBy | date: 'dd MMM' }} and not in the past.</p>
      }
      <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-full">
        <mat-label>Reason</mat-label>
        <textarea matInput rows="3" [ngModel]="remarks()" (ngModelChange)="remarks.set($event)" placeholder="Saved in the audit trail"></textarea>
      </mat-form-field>
      @if (submitted() && remarks().trim().length < 3) {
        <p class="trk-field-error -mt-2">A reason is required.</p>
      }
    </div>
    <div class="trk-dialog-footer">
      <button type="button" (click)="cancel()" class="trk-btn-secondary"><svg lucideIcon="x" class="w-4 h-4"></svg> Cancel</button>
      <button type="button" (click)="confirm()" class="trk-btn-primary"><svg lucideIcon="check" class="w-4 h-4"></svg> Extend</button>
    </div>
  `,
})
export class ExtendJobDialog {
  readonly job = inject<{ job: Job }>(MAT_DIALOG_DATA).job;
  private readonly dialogRef = inject(MatDialogRef<ExtendJobDialog, ExtendJobRequest>);

  private readonly today = toDateKey();
  readonly minDate = this.job.completeBy >= this.today ? this.nextDay(this.job.completeBy) : this.today;
  readonly date = signal(this.minDate);
  readonly remarks = signal('');
  readonly submitted = signal(false);
  readonly dateOk = computed(() => !!this.date() && this.date() > this.job.completeBy && this.date() >= this.today);

  private nextDay(key: string) {
    const d = new Date(`${key}T12:00:00`);
    d.setDate(d.getDate() + 1);
    return toDateKey(d);
  }

  cancel() {
    this.dialogRef.close();
  }

  confirm() {
    this.submitted.set(true);
    if (this.dateOk() && this.remarks().trim().length >= 3) this.dialogRef.close({ completeBy: this.date(), remarks: this.remarks().trim() });
  }
}
