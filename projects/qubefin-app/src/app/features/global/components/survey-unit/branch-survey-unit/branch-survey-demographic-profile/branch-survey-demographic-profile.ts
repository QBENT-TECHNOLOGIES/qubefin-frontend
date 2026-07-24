import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { form, FormField, schema, Schema } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LucideDynamicIcon } from '@lucide/angular';
import { BranchSurveyDemographicProfileRequest } from '../../../../models/branch-survey-detail';

@Component({
  selector: 'qfin-branch-survey-demographic-profile',
  imports: [
    CommonModule,
    FormField,
    MatFormFieldModule,
    MatInputModule,
    LucideDynamicIcon,
  ],
  templateUrl: './branch-survey-demographic-profile.html',
  styles: ``,
})
export class BranchSurveyDemographicProfile {
  // ────────────────────────────────────────────────
  // Form State
  // ────────────────────────────────────────────────
  readonly branchSurveyDemographicProfile = signal<BranchSurveyDemographicProfileRequest>({
      estimatedPopulation: 0,
      numberOfHouseholds: 0,
      averageFamilySize: 0,
      femalePopulationPercent: 0,
      literacyRate: 0,
      workingPopulation: 0,
      minorityPopulationPercent: 0,
      scheduledCastePercent: 0,
      scheduledTribePercent: 0,
      migrationTrend: '',
    });

  readonly branchSurveyDemographicProfileSchema: Schema<BranchSurveyDemographicProfileRequest> = schema((path) => ({
      estimatedPopulation: path.estimatedPopulation!(),
      numberOfHouseholds: path.numberOfHouseholds!(),
      averageFamilySize: path.averageFamilySize!(),
      femalePopulationPercent: path.femalePopulationPercent!(),
      literacyRate: path.literacyRate!(),
      workingPopulation: path.workingPopulation!(),
      minorityPopulationPercent: path.minorityPopulationPercent!(),
      scheduledCastePercent: path.scheduledCastePercent!(),
      scheduledTribePercent: path.scheduledTribePercent!(),
      migrationTrend: path.migrationTrend!(),
    }));

  readonly branchSurveyDemographicProfileForm: any = form(
    this.branchSurveyDemographicProfile,
    this.branchSurveyDemographicProfileSchema
  );

  // ────────────────────────────────────────────────
  // Inputs & Outputs
  // ────────────────────────────────────────────────

  // ────────────────────────────────────────────────
  // Field Value & Update Methods
  // ────────────────────────────────────────────────
}
