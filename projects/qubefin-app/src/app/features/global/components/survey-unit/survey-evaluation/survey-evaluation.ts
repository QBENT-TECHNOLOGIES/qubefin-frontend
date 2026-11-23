import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService } from 'qubefin-core';
import {
  EVALUATION_DECISIONS,
  EvaluationDecision,
  IEvaluationRequest,
} from '../../../models/survey-evaluation';
import { SurveyEvaluationService } from '../../../services/survey-evaluation-service';
import { SurveyEvaluationStore } from '../../../stores/survey-evaluation-store';
import { SurveyStore } from '../../../stores/survey-store';

// The Survey Committee evaluation of a Branch Survey.
// Members give Approve / Recheck / Reject with comments. The Committee Lead then gives the final decision.
// The server decides what each person can see and do.
@Component({
  selector: 'qfin-survey-evaluation',
  imports: [DatePipe, FormField, MatFormFieldModule, MatInputModule, LucideDynamicIcon],
  templateUrl: './survey-evaluation.html',
})
export class SurveyEvaluation {
  private readonly store = inject(SurveyEvaluationStore);
  private readonly surveyStore = inject(SurveyStore);
  private readonly service = inject(SurveyEvaluationService);
  private readonly alertService = inject(AlertService);

  readonly surveyId = input.required<string>();
  readonly decisions = EVALUATION_DECISIONS;

  readonly data = this.store.evaluations;

  // The card has nothing to say until the survey reaches the committee (or a Recheck note exists).
  readonly visible = computed(() => {
    const d = this.data();
    if (!d) return false;
    if (d.recheckComment) return true;
    return d.status !== 'Assigned' && d.status !== 'Draft';
  });

  // Form: the chosen decision and the comments.
  readonly decision = signal<EvaluationDecision | null>(null);
  readonly model = signal({ comments: '' });
  readonly evaluationForm = form(this.model);
  readonly saving = signal(false);

  readonly showForm = computed(() => !!(this.data()?.canEvaluate || this.data()?.canGiveFinal));
  readonly isFinalMode = computed(() => !!this.data()?.canGiveFinal);
  readonly progressPercent = computed(() => {
    const d = this.data();
    return d && d.requiredCount > 0 ? Math.round((d.doneCount / d.requiredCount) * 100) : 0;
  });

  constructor() {
    effect(() => this.store.setSurveyId(this.surveyId()));

    // The form shows the member's saved evaluation again, so it can be changed.
    effect(() => {
      const mine = this.data()?.myEvaluation;
      if (mine) {
        this.decision.set(mine.decision);
        this.model.set({ comments: mine.comments });
      }
    });
  }

  protected decisionClass(value: EvaluationDecision, selected: boolean): string {
    if (!selected) {
      return 'border-slate-200/60 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300';
    }
    switch (value) {
      case 'Approve':
        return 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
      case 'Recheck':
        return 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300';
      default:
        return 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-300';
    }
  }

  protected badgeClass(value: EvaluationDecision): string {
    switch (value) {
      case 'Approve':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
      case 'Recheck':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
      default:
        return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
    }
  }

  protected save() {
    const decision = this.decision();
    const comments = this.model().comments.trim();

    if (!decision) {
      this.alertService.error('Oops ....', 'Please choose Approve, Recheck or Reject.');
      return;
    }
    if (decision !== 'Approve' && !comments) {
      this.alertService.error('Oops ....', 'Comments are required for Recheck and Reject.');
      return;
    }
    if (comments.length > 500) {
      this.alertService.error('Oops ....', 'Comments can have at most 500 characters.');
      return;
    }

    const request: IEvaluationRequest = { decision, comments: comments || null };

    if (this.isFinalMode()) {
      this.alertService
        .confirm(
          'Confirmation',
          `Do you want to give the final decision "${decision}"? You cannot change it afterwards.`,
        )
        .then((result) => {
          if (result.isConfirmed) {
            this.send(this.service.saveFinalEvaluation(this.surveyId(), request));
          }
        });
    } else {
      this.send(this.service.saveMemberEvaluation(this.surveyId(), request));
    }
  }

  private send(call: ReturnType<SurveyEvaluationService['saveMemberEvaluation']>) {
    this.saving.set(true);
    call.subscribe({
      next: (resp: any) => {
        this.saving.set(false);
        this.refreshAll();
        this.alertService.success('Success', resp);
      },
      error: () => this.saving.set(false),
    });
  }

  // The survey status changes with every evaluation, so the survey screens are reloaded too.
  private refreshAll() {
    this.store.refresh();
    this.surveyStore.refreshList();
    this.surveyStore.refreshDetail();
  }
}
