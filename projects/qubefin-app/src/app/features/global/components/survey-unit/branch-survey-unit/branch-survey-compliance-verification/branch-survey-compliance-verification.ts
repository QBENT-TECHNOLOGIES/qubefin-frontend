import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { form, FormField, schema, Schema } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { LucideDynamicIcon } from '@lucide/angular';
import { BranchSurveyComplianceVerificationRequest } from '../../../../models/branch-survey-detail';

// ────────────────────────────────────────────────
// Static Option Lists
// ────────────────────────────────────────────────
const YES_NO_OPTIONS = ['Yes', 'No'];

@Component({
  selector: 'qfin-branch-survey-compliance-verification',
  imports: [
    CommonModule,
    FormField,
    MatFormFieldModule,
    MatSelectModule,
    LucideDynamicIcon,
  ],
  templateUrl: './branch-survey-compliance-verification.html',
  styles: ``,
})
export class BranchSurveyComplianceVerification {
  // ────────────────────────────────────────────────
  // Form State
  // ────────────────────────────────────────────────
  readonly branchSurveyComplianceVerification = signal<BranchSurveyComplianceVerificationRequest>({
      areaVisitedPhysically: '',
      gpsverified: '',
      localReferencesVerified: '',
      existingCustomersContacted: '',
      competitorVerificationCompleted: '',
      photographsAttached: '',
    });

  readonly branchSurveyComplianceVerificationSchema: Schema<BranchSurveyComplianceVerificationRequest> = schema((path) => ({
      areaVisitedPhysically: path.areaVisitedPhysically,
      gpsverified: path.gpsverified,
      localReferencesVerified: path.localReferencesVerified,
      existingCustomersContacted: path.existingCustomersContacted,
      competitorVerificationCompleted: path.competitorVerificationCompleted,
      photographsAttached: path.photographsAttached,
    }));

  readonly branchSurveyComplianceVerificationForm: any = form(
    this.branchSurveyComplianceVerification,
    this.branchSurveyComplianceVerificationSchema
  );

  // ────────────────────────────────────────────────
  // Inputs & Outputs
  // ────────────────────────────────────────────────

  readonly yesNoOptions = YES_NO_OPTIONS;

  // ────────────────────────────────────────────────
  // Field Value & Update Methods
  // ────────────────────────────────────────────────
}
