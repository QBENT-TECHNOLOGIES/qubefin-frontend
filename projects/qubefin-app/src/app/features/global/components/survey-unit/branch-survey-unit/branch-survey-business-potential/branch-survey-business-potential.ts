import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { form, FormField, schema, Schema } from '@angular/forms/signals';
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
  // Form State
  // ────────────────────────────────────────────────
  readonly branchSurveyBusinessPotential = signal<BranchSurveyBusinessPotentialRequest>({
      estimatedEligibleHouseholds: 0,
      estimatedWomenBorrowers: 0,
      estimatedNumberOfJlgsCentres: 0,
      estimatedLoanPortfolioPotential: 0,
      expectedMonthlyDisbursement: 0,
      estimatedCollectionEfficiency: 0,
    });

  readonly branchSurveyBusinessPotentialSchema: Schema<BranchSurveyBusinessPotentialRequest> = schema((path) => ({
      estimatedEligibleHouseholds: path.estimatedEligibleHouseholds!(),
      estimatedWomenBorrowers: path.estimatedWomenBorrowers!(),
      estimatedNumberOfJlgsCentres: path.estimatedNumberOfJlgsCentres!(),
      estimatedLoanPortfolioPotential: path.estimatedLoanPortfolioPotential!(),
      expectedMonthlyDisbursement: path.expectedMonthlyDisbursement!(),
      estimatedCollectionEfficiency: path.estimatedCollectionEfficiency!(),
    }));

  readonly branchSurveyBusinessPotentialForm: any = form(
    this.branchSurveyBusinessPotential,
    this.branchSurveyBusinessPotentialSchema
  );

  // ────────────────────────────────────────────────
  // Inputs & Outputs
  // ────────────────────────────────────────────────

  // ────────────────────────────────────────────────
  // Field Value & Update Methods
  // ────────────────────────────────────────────────
}
