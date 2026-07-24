import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideDynamicIcon } from '@lucide/angular';
import { BranchSurveyDetail } from '../../../../models/branch-survey-detail';
import { BranchSurveyConstants_CONDITION_OPTIONS } from 'qubefin-core';

// ────────────────────────────────────────────────
// Static Option Lists
// ────────────────────────────────────────────────
const CONDITION_OPTIONS = BranchSurveyConstants_CONDITION_OPTIONS;

@Component({
  selector: 'qfin-branch-survey-economic-profile',
  imports: [
    CommonModule,
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
  // Inputs & Outputs
  // ────────────────────────────────────────────────
  model = input.required<BranchSurveyDetail>();
  fieldUpdated = output<{ field: keyof BranchSurveyDetail; value: any }>();

  readonly conditionOptions = CONDITION_OPTIONS;

  // ────────────────────────────────────────────────
  // Field Value & Update Methods
  // ────────────────────────────────────────────────
  protected getValue(key: keyof BranchSurveyDetail): any {
    return (this.model() as any)[key];
  }

  protected onFieldUpdate<K extends keyof BranchSurveyDetail>(
    field: K,
    value: BranchSurveyDetail[K],
  ) {
    this.fieldUpdated.emit({ field, value });
  }

  protected onTextInput(field: keyof BranchSurveyDetail, raw: string) {
    this.onFieldUpdate(field, raw as any);
  }

  protected onNumberInput(field: keyof BranchSurveyDetail, raw: string) {
    this.onFieldUpdate(field, (raw === '' ? undefined : Number(raw)) as any);
  }
}
