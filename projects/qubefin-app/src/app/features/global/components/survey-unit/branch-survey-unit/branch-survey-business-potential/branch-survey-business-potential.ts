import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { form, FormField, schema, Schema, required } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LucideDynamicIcon } from '@lucide/angular';
import { BranchSurveyBusinessPotentialRequest } from '../../../../models/branch-survey-detail';

@Component({
  selector: 'qfin-branch-survey-business-potential',
  imports: [
    CommonModule,
    FormField,
    MatFormFieldModule,
    MatInputModule,
    LucideDynamicIcon,
  ],
  templateUrl: './branch-survey-business-potential.html',
  styles: ``,
})
export class BranchSurveyBusinessPotential {
  // ────────────────────────────────────────────────
  // State
  // ────────────────────────────────────────────────
  protected readonly branchSurveyBusinessPotential = signal<BranchSurveyBusinessPotentialRequest>({
      estimatedEligibleHouseholds: 0,
      estimatedWomenBorrowers: 0,
      estimatedNumberOfJlgsCentres: 0,
      estimatedLoanPortfolioPotential: 0,
      expectedMonthlyDisbursement: 0,
      estimatedCollectionEfficiency: 0,
    });

  // ────────────────────────────────────────────────
  // Validation
  // ────────────────────────────────────────────────

  protected readonly branchSurveyBusinessPotentialSchema: Schema<BranchSurveyBusinessPotentialRequest> = schema((path) => {
     
    });

  // ────────────────────────────────────────────────
  // Form
  // ────────────────────────────────────────────────

  protected readonly branchSurveyBusinessPotentialForm: any = form(
    this.branchSurveyBusinessPotential,
    this.branchSurveyBusinessPotentialSchema
  );
  // ────────────────────────────────────────────────
  // Options
  // ────────────────────────────────────────────────
  // ────────────────────────────────────────────────
  // Events
  // ────────────────────────────────────────────────

  // ────────────────────────────────────────────────
  // Data
  // ────────────────────────────────────────────────

  get data(): BranchSurveyBusinessPotentialRequest {
    return this.branchSurveyBusinessPotential();
  }

  set data(value: BranchSurveyBusinessPotentialRequest) {
    this.branchSurveyBusinessPotential.set(value);
  }
}
