import { CommonModule } from '@angular/common';
import { Component, input, signal } from '@angular/core';
import { disabled as disableField, form, FormField, schema, Schema, required } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { LucideDynamicIcon } from '@lucide/angular';
import { BranchSurveyRiskAssessmentRequest } from '../../../../models/branch-survey-detail';
import { BranchSurveyConstants_RISK_LEVEL_OPTIONS } from 'qubefin-core';

const RISK_LEVEL_OPTIONS = BranchSurveyConstants_RISK_LEVEL_OPTIONS;

@Component({
  selector: 'qfin-branch-survey-risk-assessment',
  imports: [
    CommonModule,
    FormField,
    MatFormFieldModule,
    MatSelectModule,
    LucideDynamicIcon,
  ],
  templateUrl: './branch-survey-risk-assessment.html',
  styles: ``,
})
export class BranchSurveyRiskAssessment {
  readonly disabled = input(false);

  protected readonly branchSurveyRiskAssessment = signal<BranchSurveyRiskAssessmentRequest>({
      floodRisk: '',
      cycloneRisk: '',
      landslideRisk: '',
      droughtRisk: '',
      politicalDisturbanceRisk: '',
      communalIssuesRisk: '',
      migrationRisk: '',
      businessRisk: '',
      multipleLendingRisk: '',
      collectionRisk: '',
      fraudRisk: '',
      competitionRisk: '',
    });

  // ────────────────────────────────────────────────
  // Validation
  // ────────────────────────────────────────────────

  protected readonly branchSurveyRiskAssessmentSchema: Schema<BranchSurveyRiskAssessmentRequest> = schema((path) => {
      disableField(path, { when: () => this.disabled() });
    });

  protected readonly branchSurveyRiskAssessmentForm: any = form(
    this.branchSurveyRiskAssessment,
    this.branchSurveyRiskAssessmentSchema
  );

  readonly riskLevelOptions = RISK_LEVEL_OPTIONS;

  get data(): BranchSurveyRiskAssessmentRequest {
    return this.branchSurveyRiskAssessment();
  }

  set data(value: BranchSurveyRiskAssessmentRequest) {
    this.branchSurveyRiskAssessment.set(value);
  }
}
