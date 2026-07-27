import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { form, FormField, schema, Schema, required } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { LucideDynamicIcon } from '@lucide/angular';
import { BranchSurveyRecommendationRequest } from '../../../../models/branch-survey-detail';
import { BranchSurveyConstants_RECOMMENDATION_OPTIONS } from 'qubefin-core';

const RECOMMENDATION_OPTIONS = BranchSurveyConstants_RECOMMENDATION_OPTIONS;

@Component({
  selector: 'qfin-branch-survey-recommendation',
  imports: [
    CommonModule,
    FormField,
    MatFormFieldModule,
    MatSelectModule,
    LucideDynamicIcon,
  ],
  templateUrl: './branch-survey-recommendation.html',
  styles: ``,
})
export class BranchSurveyRecommendation {
  protected readonly branchSurveyRecommendation = signal<BranchSurveyRecommendationRequest>({
      recommendation: '',
    });

  protected readonly branchSurveyRecommendationSchema: Schema<BranchSurveyRecommendationRequest> = schema((path) => {
    required(path.recommendation, {
      message: 'Recommendation is required',
    });
  });

  protected readonly branchSurveyRecommendationForm: any = form(
    this.branchSurveyRecommendation,
    this.branchSurveyRecommendationSchema
  );

  readonly recommendationOptions = RECOMMENDATION_OPTIONS;

  get data(): BranchSurveyRecommendationRequest {
    return this.branchSurveyRecommendation();
  }

  set data(value: BranchSurveyRecommendationRequest) {
    this.branchSurveyRecommendation.set(value);
  }
}
