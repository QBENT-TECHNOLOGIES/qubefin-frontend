import { CommonModule } from '@angular/common';
import { Component, input, signal } from '@angular/core';
import { disabled as disableField, form, FormField, schema, Schema, required } from '@angular/forms/signals';
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
  readonly disabled = input(false);

  // ────────────────────────────────────────────────
  // State
  // ────────────────────────────────────────────────
  protected readonly branchSurveyComplianceVerification = signal<BranchSurveyComplianceVerificationRequest>({
      areaVisitedPhysically: '',
      gpsverified: '',
      localReferencesVerified: '',
      existingCustomersContacted: '',
      competitorVerificationCompleted: '',
      photographsAttached: '',
    });

  // ────────────────────────────────────────────────
  // Validation
  // ────────────────────────────────────────────────

  protected readonly branchSurveyComplianceVerificationSchema: Schema<BranchSurveyComplianceVerificationRequest> = schema((path) => {
      disableField(path, { when: () => this.disabled() });
    });

  protected readonly branchSurveyComplianceVerificationForm: any = form(
    this.branchSurveyComplianceVerification,
    this.branchSurveyComplianceVerificationSchema
  );

  readonly yesNoOptions = YES_NO_OPTIONS;

  get data(): BranchSurveyComplianceVerificationRequest {
    return this.branchSurveyComplianceVerification();
  }

  set data(value: BranchSurveyComplianceVerificationRequest) {
    this.branchSurveyComplianceVerification.set(value);
  }
}
