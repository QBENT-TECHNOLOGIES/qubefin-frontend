import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { form, FormField, schema, Schema } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideDynamicIcon } from '@lucide/angular';
import { BranchSurveyAccessibilityAssessmentRequest } from '../../../../models/branch-survey-detail';
import { BranchSurveyConstants_RATING_OPTIONS } from 'qubefin-core';

// ────────────────────────────────────────────────
// Static Option Lists
// ────────────────────────────────────────────────
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
  // ────────────────────────────────────────────────
  // Form State
  // ────────────────────────────────────────────────
  readonly branchSurveyAccessibilityAssessment = signal<BranchSurveyAccessibilityAssessmentRequest>({
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

  readonly branchSurveyAccessibilityAssessmentSchema: Schema<BranchSurveyAccessibilityAssessmentRequest> = schema((path) => ({
      roadCondition: path.roadCondition,
      publicTransportAvailability: path.publicTransportAvailability,
      railwayConnectivity: path.railwayConnectivity,
      busConnectivity: path.busConnectivity,
      mobileNetworkCoverage: path.mobileNetworkCoverage,
      internetAvailability: path.internetAvailability,
      electricitySupply: path.electricitySupply,
      drinkingWaterAvailability: path.drinkingWaterAvailability,
      safetyOfArea: path.safetyOfArea,
    }));

  readonly branchSurveyAccessibilityAssessmentForm: any = form(
    this.branchSurveyAccessibilityAssessment,
    this.branchSurveyAccessibilityAssessmentSchema
  );

  // ────────────────────────────────────────────────
  // Inputs & Outputs
  // ────────────────────────────────────────────────

  readonly ratingOptions = RATING_OPTIONS;

  // ────────────────────────────────────────────────
  // Field Value & Update Methods
  // ────────────────────────────────────────────────
}
