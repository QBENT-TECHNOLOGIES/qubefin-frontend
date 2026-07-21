import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { EMPTY_UUID } from 'qubefin-core';
import Swal from 'sweetalert2';
import { BranchSurveyDetail } from '../../../models/branch-survey-detail';

import { BranchSurveyGeographicInfo } from './branch-survey-geographic-info/branch-survey-geographic-info';
import { BranchSurveyAccessibilityAssessment } from './branch-survey-accessibility-assessment/branch-survey-accessibility-assessment';
import { BranchSurveyDemographicProfile } from './branch-survey-demographic-profile/branch-survey-demographic-profile';
import { BranchSurveyEconomicProfile } from './branch-survey-economic-profile/branch-survey-economic-profile';
import { BranchSurveyMarketPotential } from './branch-survey-market-potential/branch-survey-market-potential';
import { BranchSurveyTransportationFacilities } from './branch-survey-transportation-facilities/branch-survey-transportation-facilities';
import { BranchSurveyFinancialInclusion } from './branch-survey-financial-inclusion/branch-survey-financial-inclusion';
import { BranchSurveyCompetitionAnalysis } from './branch-survey-competition-analysis/branch-survey-competition-analysis';
import { BranchSurveyBusinessPotential } from './branch-survey-business-potential/branch-survey-business-potential';
import { BranchSurveyRiskAssessment } from './branch-survey-risk-assessment/branch-survey-risk-assessment';
import { BranchSurveyComplianceVerification } from './branch-survey-compliance-verification/branch-survey-compliance-verification';
import { BranchSurveyRecommendation } from './branch-survey-recommendation/branch-survey-recommendation';

@Component({
  selector: 'qfin-branch-survey-unit',
  imports: [
    CommonModule,
    MatStepperModule,
    MatButtonModule,
    LucideDynamicIcon,
    BranchSurveyGeographicInfo,
    BranchSurveyAccessibilityAssessment,
    BranchSurveyDemographicProfile,
    BranchSurveyEconomicProfile,
    BranchSurveyMarketPotential,
    BranchSurveyTransportationFacilities,
    BranchSurveyFinancialInclusion,
    BranchSurveyCompetitionAnalysis,
    BranchSurveyBusinessPotential,
    BranchSurveyRiskAssessment,
    BranchSurveyComplianceVerification,
    BranchSurveyRecommendation,
  ],
  providers: [provideNativeDateAdapter(), DatePipe],
  templateUrl: './branch-survey-unit.html',
  styles: ``,
})
export class BranchSurveyUnit {
  // ────────────────────────────────────────────────
  // Dependency Injection
  // ────────────────────────────────────────────────
  private readonly dateAdapter = inject(DateAdapter<Date>);
  private readonly datePipe = inject(DatePipe);

  // ────────────────────────────────────────────────
  // Component State & Model
  // ────────────────────────────────────────────────
  protected readonly formModel = signal<BranchSurveyDetailModel>(this.createEmptyModel());
  readonly isEditMode = computed(() => this.formModel().id !== EMPTY_UUID);

  constructor() {
    this.dateAdapter.setLocale('en-GB');
  }

  private createEmptyModel(): BranchSurveyDetailModel {
    return {
      id: EMPTY_UUID,
      surveyId: EMPTY_UUID,
      surveyDate: new Date(),
      administrativeUnitId: '',
      isSurveyorSubmit: false,
      isCommiteeSubmit: false,
      isApproved: false,
      isRejected: false,
      isBranchCreate: false,
    };
  }

  // ────────────────────────────────────────────────
  // Field Updates from Child Steps
  // ────────────────────────────────────────────────
  protected updateField<K extends keyof BranchSurveyDetailModel>(
    field: K,
    value: BranchSurveyDetailModel[K],
  ) {
    this.formModel.update((current) => ({
      ...current,
      [field]: value,
    }));
  }

  protected onChildFieldUpdated(event: { field: keyof BranchSurveyDetailModel; value: any }) {
    this.updateField(event.field, event.value);
  }

  // ────────────────────────────────────────────────
  // Submit / Confirmation
  // ────────────────────────────────────────────────
  protected onSubmit() {
    if (!this.formModel().administrativeUnitId) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Please complete the Administrative Unit before submitting.',
      });
      return;
    }

    Swal.fire({
      title: 'Are you sure?',
      text: `You want to ${this.isEditMode() ? 'update' : 'submit'} this branch survey!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes',
    }).then((result) => {
      if (!result.isConfirmed) return;

      const payload = {
        ...this.formModel(),
        surveyDate: this.datePipe.transform(this.formModel().surveyDate, 'yyyy-MM-dd') || '',
      };

      console.log('submit payload', payload);
    });
  }
  closePanel() {}
}

// Local alias so the file compiles standalone against your imported model.
type BranchSurveyDetailModel = BranchSurveyDetail;
