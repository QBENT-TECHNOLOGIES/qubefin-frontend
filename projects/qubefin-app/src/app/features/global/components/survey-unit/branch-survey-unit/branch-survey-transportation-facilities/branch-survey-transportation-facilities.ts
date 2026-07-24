import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { form, FormField, schema, Schema } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { LucideDynamicIcon } from '@lucide/angular';
import { BranchSurveyTransportationFacilitiesRequest } from '../../../../models/branch-survey-detail';

// ────────────────────────────────────────────────
// Static Option Lists
// ────────────────────────────────────────────────
const YES_NO_OPTIONS = ['Yes', 'No'];

@Component({
  selector: 'qfin-branch-survey-transportation-facilities',
  imports: [
    CommonModule,
    FormField,
    MatFormFieldModule,
    MatSelectModule,
    LucideDynamicIcon,
  ],
  templateUrl: './branch-survey-transportation-facilities.html',
  styles: ``,
})
export class BranchSurveyTransportationFacilities {
  // ────────────────────────────────────────────────
  // Form State
  // ────────────────────────────────────────────────
  readonly branchSurveyTransportationFacilities = signal<BranchSurveyTransportationFacilitiesRequest>({
      railConnectivity: '',
      busConnectivityAvailable: '',
      autoTotoAvailability: '',
      roadAccessibility: '',
      accessibilityByMotorCycle: '',
    });

  readonly branchSurveyTransportationFacilitiesSchema: Schema<BranchSurveyTransportationFacilitiesRequest> = schema((path) => ({
      railConnectivity: path.railConnectivity!(),
      busConnectivityAvailable: path.busConnectivityAvailable!(),
      autoTotoAvailability: path.autoTotoAvailability!(),
      roadAccessibility: path.roadAccessibility!(),
      accessibilityByMotorCycle: path.accessibilityByMotorCycle!(),
    }));

  readonly branchSurveyTransportationFacilitiesForm: any = form(
    this.branchSurveyTransportationFacilities,
    this.branchSurveyTransportationFacilitiesSchema
  );

  // ────────────────────────────────────────────────
  // Inputs & Outputs
  // ────────────────────────────────────────────────

  readonly yesNoOptions = YES_NO_OPTIONS;

  // ────────────────────────────────────────────────
  // Field Value & Update Methods
  // ────────────────────────────────────────────────
}
