import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { form, FormField, schema, Schema } from '@angular/forms/signals';
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
  // Form State
  // ────────────────────────────────────────────────
  readonly branchSurveyRiskAssessment = signal<BranchSurveyRiskAssessmentRequest>({
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

  readonly branchSurveyRiskAssessmentSchema: Schema<BranchSurveyRiskAssessmentRequest> = schema((path) => ({
      floodRisk: path.floodRisk!(),
      cycloneRisk: path.cycloneRisk!(),
      landslideRisk: path.landslideRisk!(),
      droughtRisk: path.droughtRisk!(),
      politicalDisturbanceRisk: path.politicalDisturbanceRisk!(),
      communalIssuesRisk: path.communalIssuesRisk!(),
      migrationRisk: path.migrationRisk!(),
      businessRisk: path.businessRisk!(),
      multipleLendingRisk: path.multipleLendingRisk!(),
      collectionRisk: path.collectionRisk!(),
      fraudRisk: path.fraudRisk!(),
      competitionRisk: path.competitionRisk!(),
    }));

  readonly branchSurveyRiskAssessmentForm: any = form(
    this.branchSurveyRiskAssessment,
    this.branchSurveyRiskAssessmentSchema
  );

  // ────────────────────────────────────────────────
  // Inputs & Outputs
  // ────────────────────────────────────────────────

  readonly riskLevelOptions = RISK_LEVEL_OPTIONS;

  // ────────────────────────────────────────────────
  // Field Value & Update Methods
  // ────────────────────────────────────────────────
}
