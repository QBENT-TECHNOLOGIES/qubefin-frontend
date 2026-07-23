import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatStepperModule, MatStepper } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { ActivatedRoute } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { EMPTY_UUID } from 'qubefin-core';
import Swal from 'sweetalert2';
import { BranchSurveyDetail, BranchSurveyRequest } from '../../../models/branch-survey-detail';
import { BranchSurveyStore } from '../../../stores/branch-survey-store';

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
  private readonly store = inject(BranchSurveyStore);
  private readonly route = inject(ActivatedRoute);

  // ────────────────────────────────────────────────
  // Component State & Model
  // ────────────────────────────────────────────────
  protected readonly formModel = signal<BranchSurveyDetailModel>(this.createEmptyModel());  
  readonly surveyId = signal<string>(EMPTY_UUID);
  readonly isEditMode = computed(() => this.formModel().id !== EMPTY_UUID);

  constructor() {
    this.dateAdapter.setLocale('en-GB');

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.surveyId.set(id);
        this.store.setSurveyId(id);
        console.log(id);
      }
    });

    effect(() => {
      const detail = this.store.branchSurvey();
      if (detail) {
        this.formModel.set({ ...detail });
      }
    }, { allowSignalWrites: true });
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
  protected async saveStep(stepName: string, stepper: MatStepper | null) {
    if (!this.formModel().administrativeUnitId && stepName === 'GeographicInformation') {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Please complete the Administrative Unit before saving.',
      });
      return;
    }

    const currentModel = this.formModel();
    const payload: BranchSurveyRequest = {
      id: currentModel.id,
      surveyId: this.surveyId(),
    };

    switch (stepName) {
      case 'GeographicInformation':
        payload.geographicInformation = {
          surveyDate: currentModel.surveyDate,
          proposedOperationalArea: currentModel.proposedOperationalArea,
          administrativeUnitId: currentModel.administrativeUnitId,
          pinCode: currentModel.pinCode,
          latitude: currentModel.latitude,
          longitude: currentModel.longitude,
          geoTag: currentModel.geoTag,
          nearestLandmark: currentModel.nearestLandmark,
          administrativeStatus: currentModel.administrativeStatus,
          distanceFromExistingWeGrowBranch: currentModel.distanceFromExistingWeGrowBranch,
          distanceFromDistrictHeadquarters: currentModel.distanceFromDistrictHeadquarters,
        };
        break;
      case 'AccessibilityAssessment':
        payload.accessibilityAssessment = {
          roadCondition: currentModel.roadCondition,
          publicTransportAvailability: currentModel.publicTransportAvailability,
          railwayConnectivity: currentModel.railwayConnectivity,
          busConnectivity: currentModel.busConnectivity,
          mobileNetworkCoverage: currentModel.mobileNetworkCoverage,
          internetAvailability: currentModel.internetAvailability,
          electricitySupply: currentModel.electricitySupply,
          drinkingWaterAvailability: currentModel.drinkingWaterAvailability,
          safetyOfArea: currentModel.safetyOfArea,
        };
        break;
      case 'DemographicProfile':
        payload.demographicProfile = {
          estimatedPopulation: currentModel.estimatedPopulation,
          numberOfHouseholds: currentModel.numberOfHouseholds,
          averageFamilySize: currentModel.averageFamilySize,
          femalePopulationPercent: currentModel.femalePopulationPercent,
          literacyRate: currentModel.literacyRate,
          workingPopulation: currentModel.workingPopulation,
          minorityPopulationPercent: currentModel.minorityPopulationPercent,
          scheduledCastePercent: currentModel.scheduledCastePercent,
          scheduledTribePercent: currentModel.scheduledTribePercent,
          migrationTrend: currentModel.migrationTrend,
        };
        break;
      case 'EconomicProfile':
        payload.economicProfile = {
          agriculturePercent: currentModel.agriculturePercent,
          agriculturalLabour: currentModel.agriculturalLabour,
          dairyLivestock: currentModel.dairyLivestock,
          smallBusiness: currentModel.smallBusiness,
          pettyTrade: currentModel.pettyTrade,
          cottageSmallIndustries: currentModel.cottageSmallIndustries,
          transportActivities: currentModel.transportActivities,
          serviceHolders: currentModel.serviceHolders,
          dailyWageEarners: currentModel.dailyWageEarners,
          otherIncomeGeneratingActivities: currentModel.otherIncomeGeneratingActivities,
          mainCrop: currentModel.mainCrop,
          peakBusinessSeason: currentModel.peakBusinessSeason,
          leanSeason: currentModel.leanSeason,
          overallEconomicCondition: currentModel.overallEconomicCondition,
        };
        break;
      case 'MarketPotential':
        payload.marketPotential = {
          eligibleHouseholds: currentModel.eligibleHouseholds,
          potentialWomenBorrowers: currentModel.potentialWomenBorrowers,
          jlgpotential: currentModel.jLGPotential,
          individualBusinessLoansExpected: currentModel.individualBusinessLoansExpected,
          portfolioYear1: currentModel.portfolioYear1,
          portfolioYear2: currentModel.portfolioYear2,
          portfolioYear3: currentModel.portfolioYear3,
        };
        break;
      case 'TransportationFacilities':
        payload.transportationFacilities = {
          railConnectivity: currentModel.railConnectivity,
          busConnectivityAvailable: currentModel.busConnectivityAvailable,
          autoTotoAvailability: currentModel.autoTotoAvailability,
          roadAccessibility: currentModel.roadAccessibility,
          accessibilityByMotorCycle: currentModel.accessibilityByMotorCycle,
        };
        break;
      case 'FinancialInclusion':
        payload.financialInclusionStatus = {
          numberOfBanks: currentModel.numberOfBanks,
          numberOfRegionalRuralBanks: currentModel.numberOfRegionalRuralBanks,
          numberOfCooperativeBanks: currentModel.numberOfCooperativeBanks,
          bankingCorrespondents: currentModel.bankingCorrespondents,
          atms: currentModel.aTMs,
          digitalPaymentAcceptance: currentModel.digitalPaymentAcceptance,
        };
        break;
      case 'CompetitionAnalysis':
        payload.microfinanceCompetition = {
          nameOfInstitution: currentModel.nameOfInstitution,
          approxClients: currentModel.approxClients,
          approxPortfolio: currentModel.approxPortfolio,
          parpercent: currentModel.pARPercent,
        };
        break;
      case 'BusinessPotential':
        payload.businessPotential = {
          estimatedEligibleHouseholds: currentModel.estimatedEligibleHouseholds,
          estimatedWomenBorrowers: currentModel.estimatedWomenBorrowers,
          estimatedNumberOfJlgsCentres: currentModel.estimatedNumberOfJLGsCentres,
          estimatedLoanPortfolioPotential: currentModel.estimatedLoanPortfolioPotential,
          expectedMonthlyDisbursement: currentModel.expectedMonthlyDisbursement,
          estimatedCollectionEfficiency: currentModel.estimatedCollectionEfficiency,
        };
        break;
      case 'RiskAssessment':
        payload.riskAssessment = {
          floodRisk: currentModel.floodRisk,
          cycloneRisk: currentModel.cycloneRisk,
          landslideRisk: currentModel.landslideRisk,
          droughtRisk: currentModel.droughtRisk,
          politicalDisturbanceRisk: currentModel.politicalDisturbanceRisk,
          communalIssuesRisk: currentModel.communalIssuesRisk,
          migrationRisk: currentModel.migrationRisk,
          businessRisk: currentModel.businessRisk,
          multipleLendingRisk: currentModel.multipleLendingRisk,
          collectionRisk: currentModel.collectionRisk,
          fraudRisk: currentModel.fraudRisk,
          competitionRisk: currentModel.competitionRisk,
        };
        break;
      case 'ComplianceVerification':
        payload.complianceVerification = {
          areaVisitedPhysically: currentModel.areaVisitedPhysically,
          gpsverified: currentModel.gPSVerified,
          localReferencesVerified: currentModel.localReferencesVerified,
          existingCustomersContacted: currentModel.existingCustomersContacted,
          competitorVerificationCompleted: currentModel.competitorVerificationCompleted,
          photographsAttached: currentModel.photographsAttached,
        };
        break;
      case 'Recommendation':
        payload.recommendation = {
          recommendation: currentModel.recommendation,
        };
        break;
    }

    try {
      await this.store.saveBranchSurveyStep(payload);
      if (stepper) {
        stepper.next();
      } else {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Survey submitted successfully',
        });
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to save step',
      });
    }
  }

  closePanel() {}
}

// Local alias so the file compiles standalone against your imported model.
type BranchSurveyDetailModel = BranchSurveyDetail;
