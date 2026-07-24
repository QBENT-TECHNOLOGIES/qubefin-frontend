import { Component, computed, effect, inject, signal, Input, Output, EventEmitter, viewChild } from '@angular/core';
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
  @Input() set surveyIdInput(id: string | undefined) {
    if (id && id !== EMPTY_UUID) {
      this.surveyId.set(id);
      this.store.setSurveyId(id);
      this.store.fetchBranchSurvey(id);
    } else {
      this.store.clearBranchSurvey();
      this.formModel.set(this.createEmptyModel());
    }
  }

  @Output() cancel = new EventEmitter<string>();

  protected readonly formModel = signal<BranchSurveyDetailModel>(this.createEmptyModel());

  readonly geographicInfoComp = viewChild(BranchSurveyGeographicInfo);
  readonly accessibilityAssessmentComp = viewChild(BranchSurveyAccessibilityAssessment);
  readonly demographicProfileComp = viewChild(BranchSurveyDemographicProfile);
  readonly economicProfileComp = viewChild(BranchSurveyEconomicProfile);
  readonly marketPotentialComp = viewChild(BranchSurveyMarketPotential);
  readonly transportationFacilitiesComp = viewChild(BranchSurveyTransportationFacilities);
  readonly financialInclusionComp = viewChild(BranchSurveyFinancialInclusion);
  readonly competitionAnalysisComp = viewChild(BranchSurveyCompetitionAnalysis);
  readonly businessPotentialComp = viewChild(BranchSurveyBusinessPotential);
  readonly riskAssessmentComp = viewChild(BranchSurveyRiskAssessment);
  readonly complianceVerificationComp = viewChild(BranchSurveyComplianceVerification);
  readonly recommendationComp = viewChild(BranchSurveyRecommendation);
  
  readonly surveyId = signal<string>(EMPTY_UUID);
  readonly isEditMode = computed(() => this.formModel().id !== EMPTY_UUID);

  constructor() {
    effect(() => {
      const data = this.formModel();
      if (data) {
        const geo = this.geographicInfoComp();
        if (geo) geo.branchSurveyGeographicInfo.set({
          surveyDate: data.surveyDate || '',
          proposedOperationalArea: data.proposedOperationalArea || '',
          administrativeUnitId: data.administrativeUnitId || '',
          pinCode: data.pinCode || '',
          latitude: data.latitude || 0,
          longitude: data.longitude || 0,
          geoTag: data.geoTag || '',
          nearestLandmark: data.nearestLandmark || '',
          administrativeStatus: data.administrativeStatus || '',
          distanceFromExistingWeGrowBranch: data.distanceFromExistingWeGrowBranch || 0,
          distanceFromDistrictHeadquarters: data.distanceFromDistrictHeadquarters || 0
        });

        const acc = this.accessibilityAssessmentComp();
        if (acc) acc.branchSurveyAccessibilityAssessment.set({
          roadCondition: data.roadCondition,
          publicTransportAvailability: data.publicTransportAvailability,
          railwayConnectivity: data.railwayConnectivity,
          busConnectivity: data.busConnectivity,
          mobileNetworkCoverage: data.mobileNetworkCoverage,
          internetAvailability: data.internetAvailability,
          electricitySupply: data.electricitySupply,
          drinkingWaterAvailability: data.drinkingWaterAvailability,
          safetyOfArea: data.safetyOfArea
        });

        const dem = this.demographicProfileComp();
        if (dem) dem.branchSurveyDemographicProfile.set({
          estimatedPopulation: data.estimatedPopulation,
          numberOfHouseholds: data.numberOfHouseholds,
          averageFamilySize: data.averageFamilySize,
          femalePopulationPercent: data.femalePopulationPercent,
          literacyRate: data.literacyRate,
          workingPopulation: data.workingPopulation,
          minorityPopulationPercent: data.minorityPopulationPercent,
          scheduledCastePercent: data.scheduledCastePercent,
          scheduledTribePercent: data.scheduledTribePercent,
          migrationTrend: data.migrationTrend
        });

        const eco = this.economicProfileComp();
        if (eco) eco.branchSurveyEconomicProfile.set({
          agriculturePercent: data.agriculturePercent,
          agriculturalLabour: data.agriculturalLabour,
          dairyLivestock: data.dairyLivestock,
          smallBusiness: data.smallBusiness,
          pettyTrade: data.pettyTrade,
          cottageSmallIndustries: data.cottageSmallIndustries,
          transportActivities: data.transportActivities,
          serviceHolders: data.serviceHolders,
          dailyWageEarners: data.dailyWageEarners,
          otherIncomeGeneratingActivities: data.otherIncomeGeneratingActivities,
          mainCrop: data.mainCrop,
          peakBusinessSeason: data.peakBusinessSeason,
          leanSeason: data.leanSeason,
          overallEconomicCondition: data.overallEconomicCondition
        });

        const mar = this.marketPotentialComp();
        if (mar) mar.branchSurveyMarketPotential.set({
          eligibleHouseholds: data.eligibleHouseholds,
          potentialWomenBorrowers: data.potentialWomenBorrowers,
          jlgpotential: data.jLGPotential,
          individualBusinessLoansExpected: data.individualBusinessLoansExpected,
          portfolioYear1: data.portfolioYear1,
          portfolioYear2: data.portfolioYear2,
          portfolioYear3: data.portfolioYear3
        });

        const tra = this.transportationFacilitiesComp();
        if (tra) tra.branchSurveyTransportationFacilities.set({
          railConnectivity: data.railConnectivity,
          busConnectivityAvailable: data.busConnectivityAvailable,
          autoTotoAvailability: data.autoTotoAvailability,
          roadAccessibility: data.roadAccessibility,
          accessibilityByMotorCycle: data.accessibilityByMotorCycle
        });

        const fin = this.financialInclusionComp();
        if (fin) fin.branchSurveyFinancialInclusionStatus.set({
          numberOfBanks: data.numberOfBanks,
          numberOfRegionalRuralBanks: data.numberOfRegionalRuralBanks,
          numberOfCooperativeBanks: data.numberOfCooperativeBanks,
          bankingCorrespondents: data.bankingCorrespondents,
          atms: data.aTMs,
          digitalPaymentAcceptance: data.digitalPaymentAcceptance
        });

        const com = this.competitionAnalysisComp();
        if (com) com.branchSurveyMicrofinanceCompetition.set({
          nameOfInstitution: data.nameOfInstitution,
          approxClients: data.approxClients,
          approxPortfolio: data.approxPortfolio,
          parpercent: data.pARPercent
        });

        const bus = this.businessPotentialComp();
        if (bus) bus.branchSurveyBusinessPotential.set({
          estimatedEligibleHouseholds: data.estimatedEligibleHouseholds,
          estimatedWomenBorrowers: data.estimatedWomenBorrowers,
          estimatedNumberOfJlgsCentres: data.estimatedNumberOfJLGsCentres,
          estimatedLoanPortfolioPotential: data.estimatedLoanPortfolioPotential,
          expectedMonthlyDisbursement: data.expectedMonthlyDisbursement,
          estimatedCollectionEfficiency: data.estimatedCollectionEfficiency
        });

        const ris = this.riskAssessmentComp();
        if (ris) ris.branchSurveyRiskAssessment.set({
          floodRisk: data.floodRisk,
          cycloneRisk: data.cycloneRisk,
          landslideRisk: data.landslideRisk,
          droughtRisk: data.droughtRisk,
          politicalDisturbanceRisk: data.politicalDisturbanceRisk,
          communalIssuesRisk: data.communalIssuesRisk,
          migrationRisk: data.migrationRisk,
          businessRisk: data.businessRisk,
          multipleLendingRisk: data.multipleLendingRisk,
          collectionRisk: data.collectionRisk,
          fraudRisk: data.fraudRisk,
          competitionRisk: data.competitionRisk
        });

        const cv = this.complianceVerificationComp();
        if (cv) cv.branchSurveyComplianceVerification.set({
          areaVisitedPhysically: data.areaVisitedPhysically,
          gpsverified: data.gPSVerified,
          localReferencesVerified: data.localReferencesVerified,
          existingCustomersContacted: data.existingCustomersContacted,
          competitorVerificationCompleted: data.competitorVerificationCompleted,
          photographsAttached: data.photographsAttached
        });

        const rec = this.recommendationComp();
        if (rec) rec.branchSurveyRecommendation.set({
          recommendation: data.recommendation
        });
      }
    }, { allowSignalWrites: true });
    
    

    this.dateAdapter.setLocale('en-GB');

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.surveyId.set(id);
        this.store.setSurveyId(id);
      }
    });

    
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
      isSubmitButtonVisible: false
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
  private readonly stepKeyMap: Record<string, string> = {
    'Geographic Information': 'GeographicInformation',
    'Accessibility Assessment': 'AccessibilityAssessment',
    'Demographic Profile': 'DemographicProfile',
    'Economic Profile': 'EconomicProfile',
    'Market Potential Assessment': 'MarketPotential',
    'Transportation Facilities': 'TransportationFacilities',
    'Financial Inclusion Status': 'FinancialInclusion',
    'Microfinance Competition Analysis': 'CompetitionAnalysis',
    'Business Potential Assessment': 'BusinessPotential',
    'Risk Assessment': 'RiskAssessment',
    'Compliance Verification': 'ComplianceVerification',
    'Recommendation': 'Recommendation'
  };

  protected async saveCurrentStep(stepper: MatStepper) {
    const currentLabel = stepper.selected?.label;
    if (currentLabel && this.stepKeyMap[currentLabel]) {
      const stepKey = this.stepKeyMap[currentLabel];
      const isLastStep = stepper.selectedIndex === stepper.steps.length - 1;
      await this.saveStep(stepKey, isLastStep ? null : stepper);
    } else {
      console.error('Unknown step label:', currentLabel);
    }
  }

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
      case 'GeographicInformation': {
        const d = this.geographicInfoComp()?.branchSurveyGeographicInfo();
        if (d) {
            payload.geographicInformation = {
            surveyDate: this.datePipe.transform(d.surveyDate, 'yyyy-MM-dd') || '',
            proposedOperationalArea: d.proposedOperationalArea,
            administrativeUnitId: d.administrativeUnitId,
            pinCode: d.pinCode,
            latitude: d.latitude,
            longitude: d.longitude,
            geoTag: d.geoTag,
            nearestLandmark: d.nearestLandmark,
            administrativeStatus: d.administrativeStatus,
            distanceFromExistingWeGrowBranch: d.distanceFromExistingWeGrowBranch,
            distanceFromDistrictHeadquarters: d.distanceFromDistrictHeadquarters,
            };
        }
        break;
      }
      case 'AccessibilityAssessment': {
        const d = this.accessibilityAssessmentComp()?.branchSurveyAccessibilityAssessment();
        if(d) {
            payload.accessibilityAssessment = { ...d };
        }
        break;
      }
      case 'DemographicProfile': {
        const d = this.demographicProfileComp()?.branchSurveyDemographicProfile();
        if(d) payload.demographicProfile = { ...d };
        break;
      }
      case 'EconomicProfile': {
        const d = this.economicProfileComp()?.branchSurveyEconomicProfile();
        if(d) payload.economicProfile = { ...d };
        break;
      }
      case 'MarketPotential': {
        const d = this.marketPotentialComp()?.branchSurveyMarketPotential();
        if(d) payload.marketPotential = { ...d };
        break;
      }
      case 'TransportationFacilities': {
        const d = this.transportationFacilitiesComp()?.branchSurveyTransportationFacilities();
        if(d) payload.transportationFacilities = { ...d };
        break;
      }
      case 'FinancialInclusion': {
        const d = this.financialInclusionComp()?.branchSurveyFinancialInclusionStatus();
        if(d) payload.financialInclusionStatus = { ...d };
        break;
      }
      case 'CompetitionAnalysis': {
        const d = this.competitionAnalysisComp()?.branchSurveyMicrofinanceCompetition();
        if(d) payload.microfinanceCompetition = { ...d };
        break;
      }
      case 'BusinessPotential': {
        const d = this.businessPotentialComp()?.branchSurveyBusinessPotential();
        if(d) payload.businessPotential = { ...d };
        break;
      }
      case 'RiskAssessment': {
        const d = this.riskAssessmentComp()?.branchSurveyRiskAssessment();
        if(d) payload.riskAssessment = { ...d };
        break;
      }
      case 'ComplianceVerification': {
        const d = this.complianceVerificationComp()?.branchSurveyComplianceVerification();
        if(d) payload.complianceVerification = { ...d };
        break;
      }
      case 'Recommendation': {
        const d = this.recommendationComp()?.branchSurveyRecommendation();
        if(d) payload.recommendation = { ...d };
        break;
      }
    }
try {
      if(this.formModel().isSubmitButtonVisible){
        const response = payload.id === null || payload.id === EMPTY_UUID ? await this.store.CreateBranchSurveyStep(payload) : await this.store.UpdateBranchSurveyStep(payload);
        if (response?.value?.id) {
          this.formModel().id = response.value.id;
        }
      }
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

  closePanel() {
    this.cancel.emit(this.surveyId());
  }
}

// Local alias so the file compiles standalone against your imported model.
type BranchSurveyDetailModel = BranchSurveyDetail;
