// import { Component } from '@angular/core';

// @Component({
//   selector: 'qfin-branch-survey-unit',
//   imports: [],
//   templateUrl: './branch-survey-unit.html',
//   styles: ``,
// })
// export class BranchSurveyUnit {

// }
import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { EMPTY_UUID } from 'qubefin-core';
import Swal from 'sweetalert2';
import { AdministrativeUnitCascade } from '../../administrative-unit-cascade/administrative-unit-cascade';
import { BranchSurveyDetail } from '../../../models/branch-survey-detail';

// ────────────────────────────────────────────────
// Field-level config — one entry per editable model
// property. The template loops over these instead of
// repeating markup per field.
// ────────────────────────────────────────────────

type FieldType = 'text' | 'number' | 'date' | 'select' | 'cascade';

interface FieldDef {
  key: keyof BranchSurveyDetail;
  label: string;
  icon: string;
  type: FieldType;
  options?: string[];
  prefix?: string; // e.g. '₹', '%'
}

interface StepDef {
  label: string;
  icon: string;
  fields: FieldDef[];
}

// ────────────────────────────────────────────────
// Reusable option sets (drawn from the PDF's stated choices)
// ────────────────────────────────────────────────

const RATING_OPTIONS = ['Excellent', 'Good', 'Average', 'Poor'];
const CONDITION_OPTIONS = ['Good', 'Average', 'Poor'];
const YES_NO_OPTIONS = ['Yes', 'No'];
const RISK_LEVEL_OPTIONS = ['High', 'Medium', 'Low'];
const ADMIN_STATUS_OPTIONS = ['Rural', 'Semi Urban', 'Urban'];
const RECOMMENDATION_OPTIONS = ['Highly Recommended', 'Recommended', 'Not Recommended'];

// ────────────────────────────────────────────────
// Steps — grouped exactly per the PDF's section headings
// ────────────────────────────────────────────────

const STEP_DEFS: StepDef[] = [
  {
    label: 'Geographic Information',
    icon: 'map-pinned',
    fields: [
      { key: 'surveyDate', label: 'Date of Survey', icon: 'calendar-check', type: 'date' },
      {
        key: 'proposedOperationalArea',
        label: 'Proposed Operational Area',
        icon: 'map',
        type: 'text',
      },
      {
        key: 'administrativeUnitId',
        label: 'Administrative Unit',
        icon: 'map-pin',
        type: 'cascade',
      },
      { key: 'pinCode', label: 'PIN Code', icon: 'hash', type: 'text' },
      { key: 'latitude', label: 'Latitude', icon: 'locate-fixed', type: 'number' },
      { key: 'longitude', label: 'Longitude', icon: 'locate-fixed', type: 'number' },
      { key: 'geoTag', label: 'Geo Tag', icon: 'map-pinned', type: 'text' },
      { key: 'nearestLandmark', label: 'Nearest Landmark', icon: 'landmark', type: 'text' },
      {
        key: 'administrativeStatus',
        label: 'Administrative Status',
        icon: 'building-2',
        type: 'select',
        options: ADMIN_STATUS_OPTIONS,
      },
      {
        key: 'distanceFromExistingWeGrowBranch',
        label: 'Distance from Existing WeGrow Branch (km)',
        icon: 'route',
        type: 'number',
      },
      {
        key: 'distanceFromDistrictHeadquarters',
        label: 'Distance from District Headquarters (km)',
        icon: 'route',
        type: 'number',
      },
    ],
  },
  {
    label: 'Accessibility Assessment',
    icon: 'signpost',
    fields: [
      {
        key: 'roadCondition',
        label: 'Road Condition',
        icon: 'road',
        type: 'select',
        options: RATING_OPTIONS,
      },
      {
        key: 'publicTransportAvailability',
        label: 'Public Transport Availability',
        icon: 'bus',
        type: 'select',
        options: RATING_OPTIONS,
      },
      {
        key: 'railwayConnectivity',
        label: 'Railway Connectivity',
        icon: 'train-front',
        type: 'select',
        options: RATING_OPTIONS,
      },
      {
        key: 'busConnectivity',
        label: 'Bus Connectivity',
        icon: 'bus',
        type: 'select',
        options: RATING_OPTIONS,
      },
      {
        key: 'mobileNetworkCoverage',
        label: 'Mobile Network Coverage',
        icon: 'signal',
        type: 'select',
        options: RATING_OPTIONS,
      },
      {
        key: 'internetAvailability',
        label: 'Internet Availability',
        icon: 'wifi',
        type: 'select',
        options: RATING_OPTIONS,
      },
      {
        key: 'electricitySupply',
        label: 'Electricity Supply',
        icon: 'zap',
        type: 'select',
        options: RATING_OPTIONS,
      },
      {
        key: 'drinkingWaterAvailability',
        label: 'Drinking Water Availability',
        icon: 'droplets',
        type: 'select',
        options: RATING_OPTIONS,
      },
      {
        key: 'safetyOfArea',
        label: 'Safety of Area',
        icon: 'shield-check',
        type: 'select',
        options: RATING_OPTIONS,
      },
    ],
  },
  {
    label: 'Demographic Profile',
    icon: 'users',
    fields: [
      { key: 'estimatedPopulation', label: 'Estimated Population', icon: 'users', type: 'number' },
      { key: 'numberOfHouseholds', label: 'Number of Households', icon: 'home', type: 'number' },
      {
        key: 'averageFamilySize',
        label: 'Average Family Size',
        icon: 'user-round',
        type: 'number',
      },
      {
        key: 'femalePopulationPercent',
        label: 'Female Population (%)',
        icon: 'percent',
        type: 'number',
        prefix: '%',
      },
      {
        key: 'literacyRate',
        label: 'Literacy Rate (%)',
        icon: 'book-open',
        type: 'number',
        prefix: '%',
      },
      { key: 'workingPopulation', label: 'Working Population', icon: 'briefcase', type: 'number' },
      {
        key: 'minorityPopulationPercent',
        label: 'Minority Population (%)',
        icon: 'percent',
        type: 'number',
        prefix: '%',
      },
      {
        key: 'scheduledCastePercent',
        label: 'Scheduled Caste (%)',
        icon: 'percent',
        type: 'number',
        prefix: '%',
      },
      {
        key: 'scheduledTribePercent',
        label: 'Scheduled Tribe (%)',
        icon: 'percent',
        type: 'number',
        prefix: '%',
      },
      { key: 'migrationTrend', label: 'Migration Trend', icon: 'trending-up', type: 'text' },
    ],
  },
  {
    label: 'Economic Profile',
    icon: 'briefcase',
    fields: [
      {
        key: 'agriculturePercent',
        label: 'Agriculture (%)',
        icon: 'wheat',
        type: 'number',
        prefix: '%',
      },
      { key: 'agriculturalLabour', label: 'Agricultural Labour', icon: 'wheat', type: 'number' },
      { key: 'dairyLivestock', label: 'Dairy / Livestock', icon: 'beef', type: 'number' },
      { key: 'smallBusiness', label: 'Small Business', icon: 'store', type: 'number' },
      { key: 'pettyTrade', label: 'Petty Trade', icon: 'shopping-bag', type: 'number' },
      {
        key: 'cottageSmallIndustries',
        label: 'Cottage / Small Industries',
        icon: 'factory',
        type: 'number',
      },
      { key: 'transportActivities', label: 'Transport Activities', icon: 'truck', type: 'number' },
      { key: 'serviceHolders', label: 'Service Holders', icon: 'briefcase', type: 'number' },
      { key: 'dailyWageEarners', label: 'Daily Wage Earners', icon: 'hard-hat', type: 'number' },
      {
        key: 'otherIncomeGeneratingActivities',
        label: 'Other Income Generating Activities',
        icon: 'plus-circle',
        type: 'text',
      },
      { key: 'mainCrop', label: 'Main Crop', icon: 'wheat', type: 'text' },
      {
        key: 'peakBusinessSeason',
        label: 'Peak Business Season',
        icon: 'trending-up',
        type: 'text',
      },
      { key: 'leanSeason', label: 'Lean Season', icon: 'trending-down', type: 'text' },
      {
        key: 'overallEconomicCondition',
        label: 'Overall Economic Condition',
        icon: 'gauge',
        type: 'select',
        options: CONDITION_OPTIONS,
      },
    ],
  },
  {
    label: 'Market Potential Assessment',
    icon: 'target',
    fields: [
      { key: 'eligibleHouseholds', label: 'Eligible Households', icon: 'home', type: 'number' },
      {
        key: 'potentialWomenBorrowers',
        label: 'Potential Women Borrowers',
        icon: 'users',
        type: 'number',
      },
      { key: 'jLGPotential', label: 'JLG Potential', icon: 'users-round', type: 'number' },
      {
        key: 'individualBusinessLoansExpected',
        label: 'Individual Business Loans Expected',
        icon: 'wallet',
        type: 'number',
      },
      {
        key: 'portfolioYear1',
        label: 'Expected Portfolio — Year 1',
        icon: 'indian-rupee',
        type: 'number',
        prefix: '₹',
      },
      {
        key: 'portfolioYear2',
        label: 'Expected Portfolio — Year 2',
        icon: 'indian-rupee',
        type: 'number',
        prefix: '₹',
      },
      {
        key: 'portfolioYear3',
        label: 'Expected Portfolio — Year 3',
        icon: 'indian-rupee',
        type: 'number',
        prefix: '₹',
      },
    ],
  },
  {
    label: 'Transportation Facilities',
    icon: 'bus',
    fields: [
      {
        key: 'railConnectivity',
        label: 'Rail Connectivity',
        icon: 'train-front',
        type: 'select',
        options: YES_NO_OPTIONS,
      },
      {
        key: 'busConnectivityAvailable',
        label: 'Bus Connectivity',
        icon: 'bus',
        type: 'select',
        options: YES_NO_OPTIONS,
      },
      {
        key: 'autoTotoAvailability',
        label: 'Auto / Toto Availability',
        icon: 'car-front',
        type: 'select',
        options: YES_NO_OPTIONS,
      },
      {
        key: 'roadAccessibility',
        label: 'Road Accessibility',
        icon: 'road',
        type: 'select',
        options: YES_NO_OPTIONS,
      },
      {
        key: 'accessibilityByMotorCycle',
        label: 'Accessibility by Motorcycle (Throughout Year)',
        icon: 'bike',
        type: 'select',
        options: YES_NO_OPTIONS,
      },
    ],
  },
  {
    label: 'Financial Inclusion Status',
    icon: 'landmark',
    fields: [
      { key: 'numberOfBanks', label: 'Number of Banks', icon: 'landmark', type: 'number' },
      {
        key: 'numberOfRegionalRuralBanks',
        label: 'Number of Regional Rural Banks',
        icon: 'landmark',
        type: 'number',
      },
      {
        key: 'numberOfCooperativeBanks',
        label: 'Number of Cooperative Banks',
        icon: 'landmark',
        type: 'number',
      },
      {
        key: 'bankingCorrespondents',
        label: 'Banking Correspondents',
        icon: 'user-check',
        type: 'number',
      },
      { key: 'aTMs', label: 'ATMs', icon: 'credit-card', type: 'number' },
      {
        key: 'digitalPaymentAcceptance',
        label: 'Digital Payment Acceptance',
        icon: 'smartphone',
        type: 'select',
        options: YES_NO_OPTIONS,
      },
    ],
  },
  {
    label: 'Microfinance Competition Analysis',
    icon: 'swords',
    fields: [
      { key: 'nameOfInstitution', label: 'Name of Institution', icon: 'building-2', type: 'text' },
      { key: 'approxClients', label: 'Approx. Clients', icon: 'users', type: 'number' },
      {
        key: 'approxPortfolio',
        label: 'Approx. Portfolio',
        icon: 'indian-rupee',
        type: 'number',
        prefix: '₹',
      },
      { key: 'pARPercent', label: 'PAR %', icon: 'percent', type: 'number', prefix: '%' },
    ],
  },
  {
    label: 'Business Potential Assessment',
    icon: 'trending-up',
    fields: [
      {
        key: 'estimatedEligibleHouseholds',
        label: 'Estimated Eligible Households',
        icon: 'home',
        type: 'number',
      },
      {
        key: 'estimatedWomenBorrowers',
        label: 'Estimated Women Borrowers',
        icon: 'users',
        type: 'number',
      },
      {
        key: 'estimatedNumberOfJLGsCentres',
        label: 'Estimated Number of JLGs / Centres',
        icon: 'users-round',
        type: 'number',
      },
      {
        key: 'estimatedLoanPortfolioPotential',
        label: 'Estimated Loan Portfolio Potential',
        icon: 'indian-rupee',
        type: 'number',
        prefix: '₹',
      },
      {
        key: 'expectedMonthlyDisbursement',
        label: 'Expected Monthly Disbursement',
        icon: 'indian-rupee',
        type: 'number',
        prefix: '₹',
      },
      {
        key: 'estimatedCollectionEfficiency',
        label: 'Estimated Collection Efficiency (%)',
        icon: 'percent',
        type: 'number',
        prefix: '%',
      },
    ],
  },
  {
    label: 'Risk Assessment',
    icon: 'shield-alert',
    fields: [
      {
        key: 'floodRisk',
        label: 'Flood',
        icon: 'cloud-rain',
        type: 'select',
        options: RISK_LEVEL_OPTIONS,
      },
      {
        key: 'cycloneRisk',
        label: 'Cyclone',
        icon: 'wind',
        type: 'select',
        options: RISK_LEVEL_OPTIONS,
      },
      {
        key: 'landslideRisk',
        label: 'Landslide',
        icon: 'mountain',
        type: 'select',
        options: RISK_LEVEL_OPTIONS,
      },
      {
        key: 'droughtRisk',
        label: 'Drought',
        icon: 'sun',
        type: 'select',
        options: RISK_LEVEL_OPTIONS,
      },
      {
        key: 'politicalDisturbanceRisk',
        label: 'Political Disturbance',
        icon: 'flag',
        type: 'select',
        options: RISK_LEVEL_OPTIONS,
      },
      {
        key: 'communalIssuesRisk',
        label: 'Communal Issues',
        icon: 'users-round',
        type: 'select',
        options: RISK_LEVEL_OPTIONS,
      },
      {
        key: 'migrationRisk',
        label: 'Migration',
        icon: 'trending-up',
        type: 'select',
        options: RISK_LEVEL_OPTIONS,
      },
      {
        key: 'businessRisk',
        label: 'Overall Business Risk',
        icon: 'briefcase',
        type: 'select',
        options: RISK_LEVEL_OPTIONS,
      },
      {
        key: 'multipleLendingRisk',
        label: 'Multiple Lending',
        icon: 'repeat',
        type: 'select',
        options: RISK_LEVEL_OPTIONS,
      },
      {
        key: 'collectionRisk',
        label: 'Collection Risk',
        icon: 'wallet',
        type: 'select',
        options: RISK_LEVEL_OPTIONS,
      },
      {
        key: 'fraudRisk',
        label: 'Fraud Risk',
        icon: 'shield-alert',
        type: 'select',
        options: RISK_LEVEL_OPTIONS,
      },
      {
        key: 'competitionRisk',
        label: 'Competition Risk',
        icon: 'swords',
        type: 'select',
        options: RISK_LEVEL_OPTIONS,
      },
    ],
  },
  {
    label: 'Compliance Verification',
    icon: 'clipboard-check',
    fields: [
      {
        key: 'areaVisitedPhysically',
        label: 'Area Visited Physically',
        icon: 'map-pin',
        type: 'select',
        options: YES_NO_OPTIONS,
      },
      {
        key: 'gPSVerified',
        label: 'GPS Verified',
        icon: 'locate-fixed',
        type: 'select',
        options: YES_NO_OPTIONS,
      },
      {
        key: 'localReferencesVerified',
        label: 'Local References Verified',
        icon: 'user-check',
        type: 'select',
        options: YES_NO_OPTIONS,
      },
      {
        key: 'existingCustomersContacted',
        label: 'Existing Customers Contacted',
        icon: 'phone',
        type: 'select',
        options: YES_NO_OPTIONS,
      },
      {
        key: 'competitorVerificationCompleted',
        label: 'Competitor Verification Completed',
        icon: 'search-check',
        type: 'select',
        options: YES_NO_OPTIONS,
      },
      {
        key: 'photographsAttached',
        label: 'Photographs Attached',
        icon: 'camera',
        type: 'select',
        options: YES_NO_OPTIONS,
      },
    ],
  },
  {
    label: 'Recommendation',
    icon: 'thumbs-up',
    fields: [
      {
        key: 'recommendation',
        label: 'Recommendation',
        icon: 'thumbs-up',
        type: 'select',
        options: RECOMMENDATION_OPTIONS,
      },
    ],
  },
];

@Component({
  selector: 'qfin-branch-survey-unit',
  imports: [
    CommonModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    LucideDynamicIcon,
    AdministrativeUnitCascade,
  ],
  providers: [provideNativeDateAdapter(), DatePipe],
  templateUrl: './branch-survey-unit.html',
  styles: ``,
})
export class BranchSurveyUnit {
  // ────────────────────────────────────────────────
  // NOTE: wire these to your actual service/store —
  // mirrored here from SurveyUnitDetail's shape since
  // none was provided for branch survey.
  // ────────────────────────────────────────────────
  // private readonly branchSurveyStore = inject(BranchSurveyStore);
  // private readonly branchSurveyService = inject(BranchSurveyService);

  private readonly dateAdapter = inject(DateAdapter<Date>);
  private readonly datePipe = inject(DatePipe);

  readonly steps = STEP_DEFS;

  protected readonly formModel = signal<BranchSurveyDetailModel>(this.createEmptyModel());

  readonly isEditMode = computed(() => this.formModel().id !== EMPTY_UUID);

  constructor() {
    this.dateAdapter.setLocale('en-GB');

    // Wire this up the same way SurveyUnitDetail does with surveyStore.surveyUnit():
    //
    // effect(() => {
    //   const detail = this.branchSurveyStore.branchSurveyDetail();
    //   if (!detail) return;
    //   this.formModel.set({ ...detail, surveyDate: new Date(detail.surveyDate) });
    // });
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
  // Generic field access — the template reads/writes
  // every field through these instead of one getter/
  // setter pair per field.
  // ────────────────────────────────────────────────

  protected getValue(key: keyof BranchSurveyDetailModel): any {
    return (this.formModel() as any)[key];
  }

  protected updateField<K extends keyof BranchSurveyDetailModel>(
    field: K,
    value: BranchSurveyDetailModel[K],
  ) {
    this.formModel.update((current) => ({
      ...current,
      [field]: value,
    }));
  }

  protected onTextInput(key: keyof BranchSurveyDetailModel, raw: string) {
    this.updateField(key, raw as any);
  }

  protected onNumberInput(key: keyof BranchSurveyDetailModel, raw: string) {
    this.updateField(key, (raw === '' ? undefined : Number(raw)) as any);
  }

  // ────────────────────────────────────────────────
  // Navigation / submit
  // ────────────────────────────────────────────────

  protected onCascadeChanged(id: string) {
    this.updateField('administrativeUnitId', id);
  }

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

      // this.branchSurveyService.create(payload).subscribe(...) / .update(payload).subscribe(...)
      console.log('submit payload', payload);
    });
  }
}

// Local alias so the file compiles standalone against your imported model.
type BranchSurveyDetailModel = BranchSurveyDetail;
