import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { form, FormField, schema, Schema, required } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideDynamicIcon } from '@lucide/angular';
import { BranchSurveyFinancialInclusionStatusRequest } from '../../../../models/branch-survey-detail';
import { BranchSurveyConstants_YES_NO_OPTIONS } from 'qubefin-core';

// ────────────────────────────────────────────────
// Static Option Lists
// ────────────────────────────────────────────────
const YES_NO_OPTIONS = BranchSurveyConstants_YES_NO_OPTIONS;

@Component({
  selector: 'qfin-branch-survey-financial-inclusion',
  imports: [
    CommonModule,
    FormField,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    LucideDynamicIcon,
  ],
  templateUrl: './branch-survey-financial-inclusion.html',
  styles: ``,
})
export class BranchSurveyFinancialInclusion {
  // ────────────────────────────────────────────────
  // State
  // ────────────────────────────────────────────────
  protected readonly branchSurveyFinancialInclusionStatus = signal<BranchSurveyFinancialInclusionStatusRequest>({
      numberOfBanks: 0,
      numberOfRegionalRuralBanks: 0,
      numberOfCooperativeBanks: 0,
      bankingCorrespondents: 0,
      atms: 0,
      digitalPaymentAcceptance: '',
    });

  // ────────────────────────────────────────────────
  // Validation
  // ────────────────────────────────────────────────

  protected readonly branchSurveyFinancialInclusionStatusSchema: Schema<BranchSurveyFinancialInclusionStatusRequest> = schema((path) => {
      
    });

  // ────────────────────────────────────────────────
  // Form
  // ────────────────────────────────────────────────

  protected readonly branchSurveyFinancialInclusionStatusForm: any = form(
    this.branchSurveyFinancialInclusionStatus,
    this.branchSurveyFinancialInclusionStatusSchema
  );
  // ────────────────────────────────────────────────
  // Options
  // ────────────────────────────────────────────────

  readonly yesNoOptions = YES_NO_OPTIONS;
  // ────────────────────────────────────────────────
  // Events
  // ────────────────────────────────────────────────

  // ────────────────────────────────────────────────
  // Data
  // ────────────────────────────────────────────────

  get data(): BranchSurveyFinancialInclusionStatusRequest {
    return this.branchSurveyFinancialInclusionStatus();
  }

  set data(value: BranchSurveyFinancialInclusionStatusRequest) {
    this.branchSurveyFinancialInclusionStatus.set(value);
  }
}
