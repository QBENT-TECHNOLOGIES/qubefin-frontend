import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { LucideDynamicIcon } from '@lucide/angular';
import { AdministrativeUnitCascade } from '../../../administrative-unit-cascade/administrative-unit-cascade';
import { BranchSurveyDetail } from '../../../../models/branch-survey-detail';

// ────────────────────────────────────────────────
// Static Option Lists
// ────────────────────────────────────────────────
const ADMIN_STATUS_OPTIONS = ['Rural', 'Semi Urban', 'Urban'];

@Component({
  selector: 'qfin-branch-survey-geographic-info',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    LucideDynamicIcon,
    AdministrativeUnitCascade,
  ],
  templateUrl: './branch-survey-geographic-info.html',
  styles: ``,
})
export class BranchSurveyGeographicInfo {
  // ────────────────────────────────────────────────
  // Inputs & Outputs
  // ────────────────────────────────────────────────
  model = input.required<BranchSurveyDetail>();
  fieldUpdated = output<{ field: keyof BranchSurveyDetail; value: any }>();

  readonly adminStatusOptions = ADMIN_STATUS_OPTIONS;

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

  protected onDateChanged(field: keyof BranchSurveyDetail, value: Date | null) {
    if (value) {
      this.onFieldUpdate(field, value);
    }
  }

  protected onCascadeChanged(id: string) {
    this.onFieldUpdate('administrativeUnitId', id);
  }
}
