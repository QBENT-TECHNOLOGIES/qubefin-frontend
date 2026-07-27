import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { form, FormField, schema, Schema, required } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { LucideDynamicIcon } from '@lucide/angular';
import { BranchSurveyRiskAssessmentRequest } from '../../../../models/branch-survey-detail';
import { BranchSurveyConstants_RISK_LEVEL_OPTIONS } from 'qubefin-core';

// ────────────────────────────────────────────────
// Static Option Lists
// ────────────────────────────────────────────────
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
  // ────────────────────────────────────────────────
  // State
  // ────────────────────────────────────────────────
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
      
    });

  // ────────────────────────────────────────────────
  // Form
  // ────────────────────────────────────────────────

  protected readonly branchSurveyRiskAssessmentForm: any = form(
    this.branchSurveyRiskAssessment,
    this.branchSurveyRiskAssessmentSchema
  );
  // ────────────────────────────────────────────────
  // Options
  // ────────────────────────────────────────────────

  readonly riskLevelOptions = RISK_LEVEL_OPTIONS;
  // ────────────────────────────────────────────────
  // Events
  // ────────────────────────────────────────────────

  // ────────────────────────────────────────────────
  // Data
  // ────────────────────────────────────────────────

  get data(): BranchSurveyRiskAssessmentRequest {
    return this.branchSurveyRiskAssessment();
  }

  set data(value: BranchSurveyRiskAssessmentRequest) {
    this.branchSurveyRiskAssessment.set(value);
  }
}
