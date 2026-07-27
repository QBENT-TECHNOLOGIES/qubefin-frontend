import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { form, FormField, schema, Schema, required } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideDynamicIcon } from '@lucide/angular';
import { BranchSurveyEconomicProfileRequest } from '../../../../models/branch-survey-detail';
import { BranchSurveyConstants_CONDITION_OPTIONS } from 'qubefin-core';

// ────────────────────────────────────────────────
// Static Option Lists
// ────────────────────────────────────────────────
const CONDITION_OPTIONS = BranchSurveyConstants_CONDITION_OPTIONS;

@Component({
  selector: 'qfin-branch-survey-economic-profile',
  imports: [
    CommonModule,
    FormField,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    LucideDynamicIcon,
  ],
  templateUrl: './branch-survey-economic-profile.html',
  styles: ``,
})
export class BranchSurveyEconomicProfile {
  protected readonly branchSurveyEconomicProfile = signal<BranchSurveyEconomicProfileRequest>({
      agriculturePercent: 0,
      agriculturalLabour: 0,
      dairyLivestock: 0,
      smallBusiness: 0,
      pettyTrade: 0,
      cottageSmallIndustries: 0,
      transportActivities: 0,
      serviceHolders: 0,
      dailyWageEarners: 0,
      otherIncomeGeneratingActivities: '',
      mainCrop: '',
      peakBusinessSeason: '',
      leanSeason: '',
      overallEconomicCondition: '',
    });

  // ────────────────────────────────────────────────
  // Validation
  // ────────────────────────────────────────────────

  protected readonly branchSurveyEconomicProfileSchema: Schema<BranchSurveyEconomicProfileRequest> = schema((path) => {
     
    });

  protected readonly branchSurveyEconomicProfileForm: any = form(
    this.branchSurveyEconomicProfile,
    this.branchSurveyEconomicProfileSchema
  );

  readonly conditionOptions = CONDITION_OPTIONS;

  get data(): BranchSurveyEconomicProfileRequest {
    return this.branchSurveyEconomicProfile();
  }

  set data(value: BranchSurveyEconomicProfileRequest) {
    this.branchSurveyEconomicProfile.set(value);
  }
}
