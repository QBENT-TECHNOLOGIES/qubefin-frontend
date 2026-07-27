import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { form, FormField, schema, Schema, required } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { LucideDynamicIcon } from '@lucide/angular';
import { AdministrativeUnitCascade } from '../../../administrative-unit-cascade/administrative-unit-cascade';
import { BranchSurveyGeographicInformationRequest } from '../../../../models/branch-survey-detail';
import { BranchSurveyConstants_ADMIN_STATUS_OPTIONS } from 'qubefin-core';

const ADMIN_STATUS_OPTIONS = BranchSurveyConstants_ADMIN_STATUS_OPTIONS;

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
  protected readonly branchSurveyGeographicInfo = 
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

  // ────────────────────────────────────────────────
  // Validation
  // ────────────────────────────────────────────────

  protected readonly branchSurveyGeographicInfoSchema: Schema<BranchSurveyGeographicInformationRequest> = schema((path) => {
      
    });

  protected readonly branchSurveyGeographicInfoForm: any = form(
    this.branchSurveyGeographicInfo,
    this.branchSurveyGeographicInfoSchema
  );

  readonly adminStatusOptions = ADMIN_STATUS_OPTIONS;

  get data(): BranchSurveyGeographicInformationRequest {
    return this.branchSurveyGeographicInfo();
  }

  set data(value: BranchSurveyGeographicInformationRequest) {
    this.branchSurveyGeographicInfo.set(value);
  }
  protected onCascadeChanged(id: string) {
    this.branchSurveyGeographicInfoForm().controls.administrativeUnitId.value.set(id);
  }
}
