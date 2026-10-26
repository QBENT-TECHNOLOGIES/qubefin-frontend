import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService } from 'qubefin-core';
import { InterviewPanelService } from '../../../../services/interview-panel-service';

export interface ICandidateAttendanceDialogData {
  candidateId: string;
  candidateName: string;
}

/** Start Assessment, step 1: the interviewer records whether the CANDIDATE attended. Closes with 'present'
 * (the caller then opens the assessment), 'absent', or nothing when cancelled. */
@Component({
  selector: 'qfin-candidate-attendance-dialog',
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, LucideDynamicIcon],
  template: `
    <div
      class="flex items-center justify-between px-5 py-3 bg-white/60 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      <div class="flex items-center gap-4">
        <div
          class="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-50 dark:bg-secondary-600/50 text-indigo-600 dark:text-indigo-500 border border-indigo-100 dark:border-0">
          <svg lucideIcon="user-check" class="w-6 h-6"></svg>
        </div>
        <div>
          <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100 leading-tight">Candidate Attendance</h2>
          <p class="text-sm text-slate-500 font-medium mt-1">{{ data.candidateName }}</p>
        </div>
      </div>
      <button (click)="onCancel()"
        class="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors cursor-pointer focus:outline-none">
        <svg lucideIcon="x" class="w-5 h-5"></svg>
      </button>
    </div>

    <mat-dialog-content class="p-5!">
      <p class="text-sm text-slate-600 dark:text-slate-300 mb-4">Did the candidate attend the interview?</p>
      <div class="flex gap-3">
        <button type="button" (click)="choice.set('present')"
          class="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-semibold transition-colors cursor-pointer"
          [class.bg-emerald-500]="choice() === 'present'" [class.border-emerald-500]="choice() === 'present'"
          [class.text-white]="choice() === 'present'" [class.bg-white]="choice() !== 'present'"
          [class.text-slate-600]="choice() !== 'present'" [class.border-slate-200]="choice() !== 'present'">
          <svg lucideIcon="check-circle" class="w-4 h-4"></svg> Present
        </button>
        <button type="button" (click)="choice.set('absent')"
          class="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-semibold transition-colors cursor-pointer"
          [class.bg-rose-500]="choice() === 'absent'" [class.border-rose-500]="choice() === 'absent'"
          [class.text-white]="choice() === 'absent'" [class.bg-white]="choice() !== 'absent'"
          [class.text-slate-600]="choice() !== 'absent'" [class.border-slate-200]="choice() !== 'absent'">
          <svg lucideIcon="x-circle" class="w-4 h-4"></svg> Absent
        </button>
      </div>

      @if (choice() === 'absent') {
        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-full mt-4">
          <mat-label>Remarks (reason) *</mat-label>
          <textarea matInput rows="3" maxlength="100" [ngModel]="remarks()" (ngModelChange)="remarks.set($event)"
            placeholder="Why was the candidate absent?"></textarea>
        </mat-form-field>
        @if (submitted() && !remarks().trim()) {
          <p class="mt-1 text-xs font-medium text-rose-600">Please enter the reason the candidate was absent.</p>
        }
      }
    </mat-dialog-content>

    <mat-dialog-actions class="justify-end! px-6 py-4 bg-white/60 dark:bg-slate-800 border-t border-slate-200 gap-3">
      <button (click)="onCancel()"
        class="cursor-pointer px-5 py-2.5 flex items-center gap-2 bg-white border border-slate-300 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-700 text-sm font-semibold rounded-lg shadow-sm transition-all">
        <svg lucideIcon="x" class="w-4 h-4"></svg> Cancel
      </button>
      <button (click)="onConfirm()" [disabled]="!choice() || saving()"
        class="ripple-btn shine-sweep rounded-lg px-5 py-2.5 flex items-center gap-2 text-sm font-semibold text-white bg-linear-to-r from-primary-500 to-secondary-500 shadow-glow transition cursor-pointer lift disabled:opacity-50 disabled:cursor-not-allowed">
        <svg lucideIcon="check" class="w-4 h-4"></svg>
        {{ saving() ? 'Saving...' : choice() === 'present' ? 'Start Assessment' : 'Save' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class CandidateAttendanceDialog {
  private readonly dialogRef = inject(MatDialogRef<CandidateAttendanceDialog>);
  private readonly panelService = inject(InterviewPanelService);
  private readonly alertService = inject(AlertService);
  protected readonly data = inject<ICandidateAttendanceDialogData>(MAT_DIALOG_DATA);

  protected readonly choice = signal<'present' | 'absent' | null>(null);
  protected readonly remarks = signal('');
  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);

  protected onConfirm() {
    const choice = this.choice();
    this.submitted.set(true);
    if (!choice || this.saving()) return;
    if (choice === 'absent' && !this.remarks().trim()) return;

    this.saving.set(true);
    this.panelService
      .markCandidateAttendance(this.data.candidateId, choice === 'present', choice === 'absent' ? this.remarks().trim() : null)
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.dialogRef.close(choice);
        },
        error: (error: any) => {
          this.saving.set(false);
          this.alertService.error('Error', error?.error?.message ?? 'Unable to record attendance.');
        },
      });
  }

  protected onCancel() {
    this.dialogRef.close(null);
  }
}
