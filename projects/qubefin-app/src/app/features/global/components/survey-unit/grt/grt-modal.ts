import { DatePipe } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService } from 'qubefin-core';
import { createEmptyAssessment, GRT_RATINGS, IGrtAssessment, IGrtRequest } from '../../../models/grt';
import { GrtService } from '../../../services/grt-service';
import { GrtStore } from '../../../stores/grt-store';

// What the Branch Manager types for one component.
interface IComponentAnswer {
  componentNo: number;
  verified: boolean | null;
  remarks: string;
}

// The window with the GRT form: date, the 8 components and the Final Group Assessment.
// The Head of the branch fills it in and submits it; everyone else who can see the survey reads it.
// The server decides who can write.
@Component({
  selector: 'qfin-grt-modal',
  imports: [
    DatePipe,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    LucideDynamicIcon,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './grt-modal.html',
})
export class GrtModal {
  readonly dialogRef = inject(MatDialogRef<GrtModal, boolean>);
  private readonly dialogData = inject<{ surveyId: string }>(MAT_DIALOG_DATA);
  private readonly store = inject(GrtStore);
  private readonly service = inject(GrtService);
  private readonly alertService = inject(AlertService);
  private readonly dateAdapter = inject(DateAdapter<Date>);
  private readonly datePipe = new DatePipe('en-US');

  readonly data = this.store.grt;
  readonly ratings = GRT_RATINGS;
  readonly overallOptions = ['Pass', 'Fail'];

  readonly grtDate = signal<Date | null>(null);
  readonly answers = signal<IComponentAnswer[]>([]);
  readonly assessment = signal<IGrtAssessment>(createEmptyAssessment());
  readonly saving = signal(false);

  constructor() {
    this.dateAdapter.setLocale('en-GB');

    // Fill the form from what was saved.
    effect(() => {
      const d = this.data();
      if (!d) return;
      this.grtDate.set(this.toDate(d.grtDate));
      this.answers.set(d.components.map((c) => ({ componentNo: c.componentNo, verified: c.verified, remarks: c.remarks ?? '' })));
      this.assessment.set({ ...d.assessment });
    });
  }

  // "yyyy-MM-dd" to a local Date (no time zone shift).
  private toDate(text: string | null): Date | null {
    if (!text) return null;
    const [y, m, d] = text.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  protected answerOf(componentNo: number): IComponentAnswer | undefined {
    return this.answers().find((a) => a.componentNo === componentNo);
  }

  protected setVerified(componentNo: number, verified: boolean) {
    this.answers.update((list) => list.map((a) => (a.componentNo === componentNo ? { ...a, verified } : a)));
  }

  protected setRemarks(componentNo: number, remarks: string) {
    this.answers.update((list) => list.map((a) => (a.componentNo === componentNo ? { ...a, remarks } : a)));
  }

  protected setAssessment<K extends keyof IGrtAssessment>(key: K, value: IGrtAssessment[K]) {
    this.assessment.update((current) => ({ ...current, [key]: value }));
  }

  // The value of one rating dropdown (all ratings are text).
  protected ratingValue(key: keyof IGrtAssessment): string | null {
    return this.assessment()[key] as string | null;
  }

  protected answeredCount(): number {
    return this.answers().filter((a) => a.verified !== null).length;
  }

  // The Final Group Assessment: CGT Successfully Completed + the ten ratings + Overall Recommendation.
  protected assessmentAnsweredCount(): number {
    const a = this.assessment();
    const ratings = GRT_RATINGS.filter((r) => !!a[r.key]).length;
    return ratings + (a.cgtSuccessfullyCompleted !== null ? 1 : 0) + (a.overallRecommendation ? 1 : 0);
  }

  protected assessmentTotal(): number {
    return GRT_RATINGS.length + 2;
  }

  // The progress bar counts every answer the Submit needs: the 8 components and the 12 assessment answers.
  protected progressPercent(): number {
    const total = this.answers().length + this.assessmentTotal();
    return total === 0 ? 0 : Math.round(((this.answeredCount() + this.assessmentAnsweredCount()) / total) * 100);
  }

  // A remark box opens when the user clicks "Add remark"; a component that already has a remark shows it.
  readonly openRemarks = signal<number[]>([]);

  protected openRemark(componentNo: number) {
    this.openRemarks.update((list) => (list.includes(componentNo) ? list : [...list, componentNo]));
  }

  protected showRemark(componentNo: number): boolean {
    return this.openRemarks().includes(componentNo) || !!this.answerOf(componentNo)?.remarks;
  }

  protected save(submit: boolean) {
    const date = this.grtDate();
    if (!date) {
      this.alertService.error('Oops ....', 'Please select the GRT Date.');
      return;
    }

    if (submit) {
      if (this.answeredCount() < this.answers().length) {
        this.alertService.error('Oops ....', 'Answer Verified Yes or No for every component to submit the GRT.');
        return;
      }
      const a = this.assessment();
      if (a.cgtSuccessfullyCompleted === null) {
        this.alertService.error('Oops ....', "Answer 'CGT Successfully Completed' in the Final Group Assessment.");
        return;
      }
      const missing = GRT_RATINGS.find((r) => !a[r.key]);
      if (missing) {
        this.alertService.error('Oops ....', `Answer '${missing.label}' in the Final Group Assessment.`);
        return;
      }
      if (!a.overallRecommendation) {
        this.alertService.error('Oops ....', 'Choose the Overall Recommendation (Pass or Fail).');
        return;
      }
    }

    const request: IGrtRequest = {
      grtDate: this.datePipe.transform(date, 'yyyy-MM-dd') ?? '',
      components: this.answers().map((a) => ({ componentNo: a.componentNo, verified: a.verified, remarks: a.remarks.trim() || null })),
      assessment: this.assessment(),
      submit,
    };

    const overall = this.assessment().overallRecommendation;
    this.alertService
      .confirm(
        'Confirmation',
        submit
          ? `Do you want to submit the GRT as "${overall}"? You cannot change it afterwards.${overall === 'Fail' ? ' A Fail stops the process for this survey.' : ''}`
          : 'Do you want to save the GRT?',
      )
      .then((result) => {
        if (!result.isConfirmed) return;
        this.saving.set(true);
        this.service.save(this.dialogData.surveyId, request).subscribe({
          next: (resp: any) => {
            this.saving.set(false);
            this.alertService.success('Success', resp).then(() => this.dialogRef.close(true));
          },
          error: () => this.saving.set(false),
        });
      });
  }
}
