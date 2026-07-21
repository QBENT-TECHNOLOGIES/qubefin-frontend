import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { LucideDynamicIcon } from '@lucide/angular';
import { BranchSurveyDetail } from '../../../../models/branch-survey-detail';

// ────────────────────────────────────────────────
// Static Option Lists
// ────────────────────────────────────────────────
const RISK_LEVEL_OPTIONS = ['High', 'Medium', 'Low'];

@Component({
  selector: 'qfin-branch-survey-risk-assessment',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatSelectModule,
    LucideDynamicIcon,
  ],
  templateUrl: './branch-survey-risk-assessment.html',
  styles: ``,
})
export class BranchSurveyRiskAssessment {
  // ────────────────────────────────────────────────
  // Inputs & Outputs
  // ────────────────────────────────────────────────
  model = input.required<BranchSurveyDetail>();
  fieldUpdated = output<{ field: keyof BranchSurveyDetail; value: any }>();

  readonly riskLevelOptions = RISK_LEVEL_OPTIONS;

  // ────────────────────────────────────────────────
  // Field Value & Update Methods
  // ────────────────────────────────────────────────
  protected getValue(key: keyof BranchSurveyDetail): any {
    return (this.model() as any)[key];
  }

  protected onFieldUpdate<K extends keyof BranchSurveyDetail>(
    field: K,
    value: BranchSurveyDetail[K],
  ) {
    this.fieldUpdated.emit({ field, value });
  }
}
