import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { form, FormField, schema, Schema, required } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideDynamicIcon } from '@lucide/angular';
import { BranchSurveyAccessibilityAssessmentRequest } from '../../../../models/branch-survey-detail';
import { BranchSurveyConstants_RATING_OPTIONS } from 'qubefin-core';

const RATING_OPTIONS = BranchSurveyConstants_RATING_OPTIONS;

@Component({
  selector: 'qfin-branch-survey-accessibility-assessment',
  imports: [
    CommonModule,
    FormField,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    LucideDynamicIcon,
  ],
  templateUrl: './branch-survey-accessibility-assessment.html',
  styles: ``,
})
export class BranchSurveyAccessibilityAssessment {
  
  protected readonly branchSurveyAccessibilityAssessment = signal<BranchSurveyAccessibilityAssessmentRequest>({
      roadCondition: '',
      publicTransportAvailability: '',
      railwayConnectivity: '',
      busConnectivity: '',
      mobileNetworkCoverage: '',
      internetAvailability: '',
      electricitySupply: '',
      drinkingWaterAvailability: '',
      safetyOfArea: '',
    });

  // ────────────────────────────────────────────────
  // Validation
  // ────────────────────────────────────────────────

  protected readonly branchSurveyAccessibilityAssessmentSchema: Schema<BranchSurveyAccessibilityAssessmentRequest> = schema((path) => {
      
    });

  // ────────────────────────────────────────────────
  // Form
  // ────────────────────────────────────────────────

  protected readonly branchSurveyAccessibilityAssessmentForm: any = form(
    this.branchSurveyAccessibilityAssessment,
    this.branchSurveyAccessibilityAssessmentSchema
  );

  readonly ratingOptions = RATING_OPTIONS;

  get data(): BranchSurveyAccessibilityAssessmentRequest {
    return this.branchSurveyAccessibilityAssessment();
  }

  set data(value: BranchSurveyAccessibilityAssessmentRequest) {
    this.branchSurveyAccessibilityAssessment.set(value);
  }
}
