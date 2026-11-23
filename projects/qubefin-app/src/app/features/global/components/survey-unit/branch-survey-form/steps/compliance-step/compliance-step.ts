import { Component, computed, inject, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideDynamicIcon } from '@lucide/angular';
import { BRANCH_SURVEY_OPTIONS, IComplianceSection } from '../../../../../models/branch-survey';
import { SurveyStore } from '../../../../../stores/survey-store';

// Step 8 - Section K: Compliance Verification, Section L: Recommendation, Section M: Survey Conducted By
@Component({
  selector: 'qfin-compliance-step',
  imports: [FormField, MatFormFieldModule, MatInputModule, MatSelectModule, LucideDynamicIcon],
  templateUrl: './compliance-step.html',
})
export class ComplianceStep {
  readonly compliance = input.required<FieldTree<IComplianceSection>>();
  readonly recommendation = input.required<FieldTree<string | null>>();
  readonly surveyorComments = input.required<FieldTree<string>>();

  private readonly surveyStore = inject(SurveyStore);

  // The surveyors come from the assignment (General Information). They are shown here as the people who conducted the survey.
  readonly surveyors = computed(() => this.surveyStore.surveyUnit()?.surveyAssigneds ?? []);

  readonly yesNoOptions = BRANCH_SURVEY_OPTIONS.yesNo;
  readonly recommendationOptions = BRANCH_SURVEY_OPTIONS.recommendation;

  readonly complianceFields: { key: keyof IComplianceSection; label: string; icon: string }[] = [
    { key: 'areaVisitedPhysically', label: 'Area Visited Physically', icon: 'map-pin' },
    { key: 'gpsVerified', label: 'GPS Verified', icon: 'compass' },
    { key: 'localReferencesVerified', label: 'Local References Verified', icon: 'users' },
    { key: 'existingCustomersContacted', label: 'Existing Customers Contacted', icon: 'phone' },
    { key: 'competitorVerificationCompleted', label: 'Competitor Verification Completed', icon: 'scale' },
    { key: 'photographsAttached', label: 'Photographs Attached', icon: 'camera' },
  ];
}
