import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService } from 'qubefin-core';
import { GroupRecommendationAction, IGroupRecommendationRequest } from '../../../models/group-review';
import { GROUP_SURVEY_OPTIONS } from '../../../models/group-survey';
import { EVALUATION_DECISIONS, EvaluationDecision, IEvaluationRequest } from '../../../models/survey-evaluation';
import { GroupReviewService } from '../../../services/group-review-service';
import { GroupReviewStore } from '../../../stores/group-review-store';
import { GroupSurveyStore } from '../../../stores/group-survey-store';
import { SurveyStore } from '../../../stores/survey-store';

// The Recommendation (Head of Branch) and Approval (Area Manager) of a Group Survey.
// The server decides who sees which form.
@Component({
  selector: 'qfin-group-review',
  imports: [DatePipe, FormField, MatFormFieldModule, MatInputModule, MatSelectModule, LucideDynamicIcon],
  templateUrl: './group-review.html',
})
export class GroupReview {
  private readonly store = inject(GroupReviewStore);
  private readonly groupSurveyStore = inject(GroupSurveyStore);
  private readonly surveyStore = inject(SurveyStore);
  private readonly service = inject(GroupReviewService);
  private readonly alertService = inject(AlertService);

  readonly surveyId = input.required<string>();
  readonly data = this.store.review;

  readonly recommendationOptions = GROUP_SURVEY_OPTIONS.recommendation;
  readonly decisions = EVALUATION_DECISIONS;

  // Nothing to show until the survey is submitted (or a Recheck note exists).
  readonly visible = computed(() => {
    const d = this.data();
    if (!d) return false;
    if (d.recheckComment) return true;
    return d.status !== 'Assigned' && d.status !== 'Draft';
  });

  // Head of Branch form
  readonly recommendAction = signal<GroupRecommendationAction>('Recommend');
  readonly recommendation = signal<string | null>(null);
  readonly recommendationModel = signal({ comments: '' });
  readonly recommendationForm = form(this.recommendationModel);

  // Area Manager form
  readonly decision = signal<EvaluationDecision | null>(null);
  readonly decisionModel = signal({ comments: '' });
  readonly decisionForm = form(this.decisionModel);

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

  protected actionClass(value: GroupRecommendationAction, selected: boolean): string {
    if (!selected) {
      return 'border-slate-200/60 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300';
    }
    return value === 'Recommend'
      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
      : 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  }

  protected badgeClass(value: string): string {
    if (value === 'Approve' || value === 'Highly Recommended' || value === 'Recommended') {
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
    }
    if (value === 'Recheck') {
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    }
    return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
  }

  // ===========================
  // Head of Branch
  // ===========================
  protected saveRecommendation() {
    const action = this.recommendAction();
    const comments = this.recommendationModel().comments.trim();

    if (action === 'Recommend' && !this.recommendation()) {
      this.alertService.error('Oops ....', 'Please choose the recommendation.');
      return;
    }
    if (action === 'Recheck' && !comments) {
      this.alertService.error('Oops ....', 'Comments are required to send the survey back.');
      return;
    }
    if (comments.length > 1000) {
      this.alertService.error('Oops ....', 'Comments can have at most 1000 characters.');
      return;
    }

    const request: IGroupRecommendationRequest = {
      action,
      recommendation: action === 'Recommend' ? this.recommendation() : null,
      comments: comments || null,
    };

    this.alertService
      .confirm(
        'Confirmation',
        action === 'Recommend'
          ? `Do you want to recommend this survey as "${request.recommendation}"? You cannot change it afterwards.`
          : 'Do you want to send this survey back to the Credit Officers?',
      )
      .then((result) => {
        if (result.isConfirmed) {
          this.send(this.service.recommend(this.surveyId(), request));
        }
      });
  }

  // ===========================
  // Area Manager
  // ===========================
  protected saveDecision() {
    const decision = this.decision();
    const comments = this.decisionModel().comments.trim();

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
      .confirm('Confirmation', `Do you want to give the decision "${decision}"? You cannot change it afterwards.`)
      .then((result) => {
        if (result.isConfirmed) {
          this.send(this.service.decide(this.surveyId(), request));
        }
      });
  }

  private send(call: ReturnType<GroupReviewService['recommend']>) {
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

  // The status changes, so the review, the form (sign-off blocks) and the survey screens are reloaded.
  private refreshAll() {
    this.store.refresh();
    this.groupSurveyStore.refresh();
    this.surveyStore.refreshList();
    this.surveyStore.refreshDetail();
  }
}
