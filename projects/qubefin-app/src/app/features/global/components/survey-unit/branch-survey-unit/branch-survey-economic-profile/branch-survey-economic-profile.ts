import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { form, FormField, schema, Schema } from '@angular/forms/signals';
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
  // ────────────────────────────────────────────────
  // Form State
  // ────────────────────────────────────────────────
  readonly branchSurveyEconomicProfile = signal<BranchSurveyEconomicProfileRequest>({
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

  readonly branchSurveyEconomicProfileSchema: Schema<BranchSurveyEconomicProfileRequest> = schema((path) => ({
      agriculturePercent: path.agriculturePercent!(),
      agriculturalLabour: path.agriculturalLabour!(),
      dairyLivestock: path.dairyLivestock!(),
      smallBusiness: path.smallBusiness!(),
      pettyTrade: path.pettyTrade!(),
      cottageSmallIndustries: path.cottageSmallIndustries!(),
      transportActivities: path.transportActivities!(),
      serviceHolders: path.serviceHolders!(),
      dailyWageEarners: path.dailyWageEarners!(),
      otherIncomeGeneratingActivities: path.otherIncomeGeneratingActivities!(),
      mainCrop: path.mainCrop!(),
      peakBusinessSeason: path.peakBusinessSeason!(),
      leanSeason: path.leanSeason!(),
      overallEconomicCondition: path.overallEconomicCondition!(),
    }));

  readonly branchSurveyEconomicProfileForm: any = form(
    this.branchSurveyEconomicProfile,
    this.branchSurveyEconomicProfileSchema
  );

  // ────────────────────────────────────────────────
  // Inputs & Outputs
  // ────────────────────────────────────────────────

  readonly conditionOptions = CONDITION_OPTIONS;

  // ────────────────────────────────────────────────
  // Field Value & Update Methods
  // ────────────────────────────────────────────────
}
