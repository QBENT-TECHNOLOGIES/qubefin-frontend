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
import { SurveyApprovalService } from '../../../services/survey-approval-service';
import { SurveyApprovalStore } from '../../../stores/survey-approval-store';
import { SurveyEvaluationStore } from '../../../stores/survey-evaluation-store';
import { SurveyStore } from '../../../stores/survey-store';

// The final approval of a Branch Survey by the Managing Director.
// The MD sees the decision form while the survey waits. Everyone else sees the decision, read-only.
@Component({
  selector: 'qfin-survey-approval',
  imports: [DatePipe, FormField, MatFormFieldModule, MatInputModule, LucideDynamicIcon],
  templateUrl: './survey-approval.html',
})
export class SurveyApproval {
  private readonly store = inject(SurveyApprovalStore);
  private readonly evaluationStore = inject(SurveyEvaluationStore);
  private readonly surveyStore = inject(SurveyStore);
  private readonly service = inject(SurveyApprovalService);
  private readonly alertService = inject(AlertService);

  readonly surveyId = input.required<string>();
  readonly decisions = EVALUATION_DECISIONS;
  readonly data = this.store.approval;

  // Nothing to show until the survey has reached the Managing Director.
  readonly visible = computed(() => {
    const d = this.data();
    return !!d && (d.canDecide || !!d.decision);
  });

  readonly decision = signal<EvaluationDecision | null>(null);
  readonly model = signal({ comments: '' });
  readonly approvalForm = form(this.model);
  readonly saving = signal(false);

  constructor() {
    effect(() => this.store.setSurveyId(this.surveyId()));
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

    this.alertService
      .confirm(
        'Confirmation',
        `Do you want to give the decision "${decision}"? You cannot change it afterwards.`,
      )
      .then((result) => {
        if (!result.isConfirmed) {
          return;
        }
        this.saving.set(true);
        this.service.saveDecision(this.surveyId(), request).subscribe({
          next: (resp: any) => {
            this.saving.set(false);
            this.refreshAll();
            this.alertService.success('Success', resp);
          },
          error: () => this.saving.set(false),
        });
      });
  }

  // The status changes (and after a Recheck the evaluations restart), so every survey screen is reloaded.
  private refreshAll() {
    this.store.refresh();
    this.evaluationStore.refresh();
    this.surveyStore.refreshList();
    this.surveyStore.refreshDetail();
  }
}
