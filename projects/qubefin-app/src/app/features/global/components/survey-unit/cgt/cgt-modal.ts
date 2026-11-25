import { DatePipe } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService } from 'qubefin-core';
import { ICgtRequest } from '../../../models/cgt';
import { CgtService } from '../../../services/cgt-service';
import { CgtStore } from '../../../stores/cgt-store';

// What the Credit Officer types for one topic.
interface ITopicAnswer {
  topicNo: number;
  covered: boolean | null;
  remarks: string;
}

// The window with the CGT form: dates and the 10 topics. Any Credit Officer of the survey fills it in and completes it;
// everyone else who can see the survey reads it. The server decides who can write.
@Component({
  selector: 'qfin-cgt-modal',
  imports: [DatePipe, MatDialogModule, MatFormFieldModule, MatInputModule, MatDatepickerModule, LucideDynamicIcon],
  providers: [provideNativeDateAdapter()],
  templateUrl: './cgt-modal.html',
})
export class CgtModal {
  readonly dialogRef = inject(MatDialogRef<CgtModal, boolean>);
  private readonly dialogData = inject<{ surveyId: string }>(MAT_DIALOG_DATA);
  private readonly store = inject(CgtStore);
  private readonly service = inject(CgtService);
  private readonly alertService = inject(AlertService);
  private readonly dateAdapter = inject(DateAdapter<Date>);
  private readonly datePipe = new DatePipe('en-US');

  readonly data = this.store.cgt;

  readonly startDate = signal<Date | null>(null);
  readonly endDate = signal<Date | null>(null);
  readonly answers = signal<ITopicAnswer[]>([]);
  readonly saving = signal(false);

  constructor() {
    this.dateAdapter.setLocale('en-GB');

    // Fill the form from what was saved.
    effect(() => {
      const d = this.data();
      if (!d) return;
      this.startDate.set(this.toDate(d.startDate));
      this.endDate.set(this.toDate(d.endDate));
      this.answers.set(d.topics.map((t) => ({ topicNo: t.topicNo, covered: t.covered, remarks: t.remarks ?? '' })));
    });
  }

  // "yyyy-MM-dd" to a local Date (no time zone shift).
  private toDate(text: string | null): Date | null {
    if (!text) return null;
    const [y, m, d] = text.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  protected answerOf(topicNo: number): ITopicAnswer | undefined {
    return this.answers().find((a) => a.topicNo === topicNo);
  }

  protected setCovered(topicNo: number, covered: boolean) {
    this.answers.update((list) => list.map((a) => (a.topicNo === topicNo ? { ...a, covered } : a)));
  }

  protected setRemarks(topicNo: number, remarks: string) {
    this.answers.update((list) => list.map((a) => (a.topicNo === topicNo ? { ...a, remarks } : a)));
  }

  protected answeredCount(): number {
    return this.answers().filter((a) => a.covered !== null).length;
  }

  // The progress bar: the share of the topics that have a Yes or No.
  protected progressPercent(): number {
    const total = this.answers().length;
    return total === 0 ? 0 : Math.round((this.answeredCount() / total) * 100);
  }

  // A remark box opens when the user clicks "Add remark"; a topic that already has a remark shows it.
  readonly openRemarks = signal<number[]>([]);

  protected openRemark(topicNo: number) {
    this.openRemarks.update((list) => (list.includes(topicNo) ? list : [...list, topicNo]));
  }

  protected showRemark(topicNo: number): boolean {
    return this.openRemarks().includes(topicNo) || !!this.answerOf(topicNo)?.remarks;
  }

  protected save(complete: boolean) {
    const start = this.startDate();
    const end = this.endDate();

    if (!start) {
      this.alertService.error('Oops ....', 'Please select the CGT Start Date.');
      return;
    }
    if (end && end < start) {
      this.alertService.error('Oops ....', 'End Date cannot be before the Start Date.');
      return;
    }
    if (complete) {
      if (!end) {
        this.alertService.error('Oops ....', 'Please select the CGT End Date to complete it.');
        return;
      }
      if (this.answeredCount() < this.answers().length) {
        this.alertService.error('Oops ....', 'Answer Covered Yes or No for every topic to complete the CGT.');
        return;
      }
    }

    const request: ICgtRequest = {
      startDate: this.datePipe.transform(start, 'yyyy-MM-dd') ?? '',
      endDate: end ? this.datePipe.transform(end, 'yyyy-MM-dd') : null,
      topics: this.answers().map((a) => ({ topicNo: a.topicNo, covered: a.covered, remarks: a.remarks.trim() || null })),
      complete,
    };

    this.alertService
      .confirm(
        'Confirmation',
        complete ? 'Do you want to complete the CGT? You cannot change it afterwards.' : 'Do you want to save the CGT?',
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
