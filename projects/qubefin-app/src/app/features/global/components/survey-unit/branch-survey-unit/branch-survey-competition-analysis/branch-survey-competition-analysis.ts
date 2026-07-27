import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { form, FormField, schema, Schema, required } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LucideDynamicIcon } from '@lucide/angular';
import { BranchSurveyMicrofinanceCompetitionRequest } from '../../../../models/branch-survey-detail';

@Component({
  selector: 'qfin-branch-survey-competition-analysis',
  imports: [
    CommonModule,
    FormField,
    MatFormFieldModule,
    MatInputModule,
    LucideDynamicIcon,
  ],
  templateUrl: './branch-survey-competition-analysis.html',
  styles: ``,
})
export class BranchSurveyCompetitionAnalysis {
  // ────────────────────────────────────────────────
  // State
  // ────────────────────────────────────────────────
  protected readonly branchSurveyMicrofinanceCompetition = signal<BranchSurveyMicrofinanceCompetitionRequest>({
      nameOfInstitution: '',
      approxClients: 0,
      approxPortfolio: 0,
      parpercent: 0,
    });

  // ────────────────────────────────────────────────
  // Validation
  // ────────────────────────────────────────────────

  protected readonly branchSurveyMicrofinanceCompetitionSchema: Schema<BranchSurveyMicrofinanceCompetitionRequest> = schema((path) => {
      
    });

  // ────────────────────────────────────────────────
  // Form
  // ────────────────────────────────────────────────

  protected readonly branchSurveyMicrofinanceCompetitionForm: any = form(
    this.branchSurveyMicrofinanceCompetition,
    this.branchSurveyMicrofinanceCompetitionSchema
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

  get data(): BranchSurveyMicrofinanceCompetitionRequest {
    return this.branchSurveyMicrofinanceCompetition();
  }

  set data(value: BranchSurveyMicrofinanceCompetitionRequest) {
    this.branchSurveyMicrofinanceCompetition.set(value);
  }
}
