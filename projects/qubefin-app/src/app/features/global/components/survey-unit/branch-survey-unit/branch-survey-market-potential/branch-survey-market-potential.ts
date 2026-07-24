import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { form, FormField, schema, Schema } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LucideDynamicIcon } from '@lucide/angular';
import { BranchSurveyMarketPotentialRequest } from '../../../../models/branch-survey-detail';

@Component({
  selector: 'qfin-branch-survey-market-potential',
  imports: [
    CommonModule,
    FormField,
    MatFormFieldModule,
    MatInputModule,
    LucideDynamicIcon,
  ],
  templateUrl: './branch-survey-market-potential.html',
  styles: ``,
})
export class BranchSurveyMarketPotential {
  // ────────────────────────────────────────────────
  // Form State
  // ────────────────────────────────────────────────
  readonly branchSurveyMarketPotential = signal<BranchSurveyMarketPotentialRequest>({
      eligibleHouseholds: 0,
      potentialWomenBorrowers: 0,
      jlgpotential: 0,
      individualBusinessLoansExpected: 0,
      portfolioYear1: 0,
      portfolioYear2: 0,
      portfolioYear3: 0,
    });

  readonly branchSurveyMarketPotentialSchema: Schema<BranchSurveyMarketPotentialRequest> = schema((path) => ({
      eligibleHouseholds: path.eligibleHouseholds,
      potentialWomenBorrowers: path.potentialWomenBorrowers,
      jlgpotential: path.jlgpotential,
      individualBusinessLoansExpected: path.individualBusinessLoansExpected,
      portfolioYear1: path.portfolioYear1,
      portfolioYear2: path.portfolioYear2,
      portfolioYear3: path.portfolioYear3,
    }));

  readonly branchSurveyMarketPotentialForm: any = form(
    this.branchSurveyMarketPotential,
    this.branchSurveyMarketPotentialSchema
  );

  // ────────────────────────────────────────────────
  // Inputs & Outputs
  // ────────────────────────────────────────────────

  // ────────────────────────────────────────────────
  // Field Value & Update Methods
  // ────────────────────────────────────────────────
}
