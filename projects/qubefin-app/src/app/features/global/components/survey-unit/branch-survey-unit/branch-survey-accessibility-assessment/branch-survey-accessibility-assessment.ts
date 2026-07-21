import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideDynamicIcon } from '@lucide/angular';
import { BranchSurveyDetail } from '../../../../models/branch-survey-detail';

// ────────────────────────────────────────────────
// Static Option Lists
// ────────────────────────────────────────────────
const RATING_OPTIONS = ['Excellent', 'Good', 'Average', 'Poor'];

@Component({
  selector: 'qfin-branch-survey-accessibility-assessment',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    LucideDynamicIcon,
  ],
  templateUrl: './branch-survey-accessibility-assessment.html',
  styles: ``,
})
export class BranchSurveyAccessibilityAssessment {
  // ────────────────────────────────────────────────
  // Inputs & Outputs
  // ────────────────────────────────────────────────
  model = input.required<BranchSurveyDetail>();
  fieldUpdated = output<{ field: keyof BranchSurveyDetail; value: any }>();

  readonly ratingOptions = RATING_OPTIONS;

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
