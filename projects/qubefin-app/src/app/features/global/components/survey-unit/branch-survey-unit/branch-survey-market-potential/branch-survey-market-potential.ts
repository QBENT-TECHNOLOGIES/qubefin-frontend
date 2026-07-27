import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { form, FormField, schema, Schema, required } from '@angular/forms/signals';
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
  // State
  // ────────────────────────────────────────────────
  protected readonly branchSurveyMarketPotential = signal<BranchSurveyMarketPotentialRequest>({
      eligibleHouseholds: 0,
      potentialWomenBorrowers: 0,
      jlgpotential: 0,
      individualBusinessLoansExpected: 0,
      portfolioYear1: 0,
      portfolioYear2: 0,
      portfolioYear3: 0,
    });

  // ────────────────────────────────────────────────
  // Validation
  // ────────────────────────────────────────────────

  protected readonly branchSurveyMarketPotentialSchema: Schema<BranchSurveyMarketPotentialRequest> = schema((path) => {
      // required(path.administrativeUnitId, {
      //   message: 'Administrative Unit is required',
      // });
    });

  // ────────────────────────────────────────────────
  // Form
  // ────────────────────────────────────────────────

  protected readonly branchSurveyMarketPotentialForm: any = form(
    this.branchSurveyMarketPotential,
    this.branchSurveyMarketPotentialSchema
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

  get data(): BranchSurveyMarketPotentialRequest {
    return this.branchSurveyMarketPotential();
  }

  set data(value: BranchSurveyMarketPotentialRequest) {
    this.branchSurveyMarketPotential.set(value);
  }
}
