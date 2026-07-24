import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { form, FormField, schema, Schema } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { LucideDynamicIcon } from '@lucide/angular';
import { AdministrativeUnitCascade } from '../../../administrative-unit-cascade/administrative-unit-cascade';
import { BranchSurveyGeographicInformationRequest } from '../../../../models/branch-survey-detail';

// ────────────────────────────────────────────────
// Static Option Lists
// ────────────────────────────────────────────────
const ADMIN_STATUS_OPTIONS = ['Rural', 'Semi Urban', 'Urban'];

@Component({
  selector: 'qfin-branch-survey-geographic-info',
  imports: [
    CommonModule,
    FormField,
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
  // Form State
  // ────────────────────────────────────────────────
  readonly branchSurveyGeographicInfo = 
  signal<BranchSurveyGeographicInformationRequest>({
      surveyDate: '',
      proposedOperationalArea: '',
      administrativeUnitId: '',
      pinCode: '',
      latitude: 0,
      longitude: 0,
      geoTag: '',
      nearestLandmark: '',
      administrativeStatus: '',
      distanceFromExistingWeGrowBranch: 0,
      distanceFromDistrictHeadquarters: 0,
    });

  readonly branchSurveyGeographicInfoSchema: Schema<BranchSurveyGeographicInformationRequest> = schema((path) => ({
      surveyDate: path.surveyDate,
      proposedOperationalArea: path.proposedOperationalArea,
      administrativeUnitId: path.administrativeUnitId,
      pinCode: path.pinCode,
      latitude: path.latitude,
      longitude: path.longitude,
      geoTag: path.geoTag,
      nearestLandmark: path.nearestLandmark,
      administrativeStatus: path.administrativeStatus,
      distanceFromExistingWeGrowBranch: path.distanceFromExistingWeGrowBranch,
      distanceFromDistrictHeadquarters: path.distanceFromDistrictHeadquarters,
    }));

  readonly branchSurveyGeographicInfoForm: any = form(
    this.branchSurveyGeographicInfo,
    this.branchSurveyGeographicInfoSchema
  );

  // ────────────────────────────────────────────────
  // Inputs & Outputs
  // ────────────────────────────────────────────────

  readonly adminStatusOptions = ADMIN_STATUS_OPTIONS;

  // ────────────────────────────────────────────────
  // Field Value & Update Methods
  // ────────────────────────────────────────────────
  protected onCascadeChanged(id: string) {
    this.branchSurveyGeographicInfoForm().controls.administrativeUnitId.value.set(id);
  }
}
