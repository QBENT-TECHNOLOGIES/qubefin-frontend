import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import {
  applyEach,
  form,
  FormField,
  max,
  min,
  readonly,
  required,
  schema,
  Schema,
  SchemaPath,
  validate,
} from '@angular/forms/signals';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatStepperModule } from '@angular/material/stepper';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import {
  createEmptyBranchSurveyForm,
  IBranchSurveyForm,
  IBranchSurveyResponse,
  ACTIVITY_TOTAL_MESSAGE,
  sumOfActivityShares,
} from '../../../models/branch-survey';
import { BranchSurveyService } from '../../../services/branch-survey-service';
import { BranchSurveyStore } from '../../../stores/branch-survey-store';
import { SurveyStore } from '../../../stores/survey-store';
import { AccessibilityStep } from './steps/accessibility-step/accessibility-step';
import { SurveyPhotos } from '../survey-photos/survey-photos';
import { ComplianceStep } from './steps/compliance-step/compliance-step';
import { DemographicStep } from './steps/demographic-step/demographic-step';
import { EconomicStep } from './steps/economic-step/economic-step';
import { FinancialCompetitionStep } from './steps/financial-competition-step/financial-competition-step';
import { GeographicStep } from './steps/geographic-step/geographic-step';
import { MarketBusinessStep } from './steps/market-business-step/market-business-step';
import { RiskStep } from './steps/risk-step/risk-step';

// What the step check needs from a form section.
type StepSection = () => { valid(): boolean; markAsTouched(): void };

// The Branch Location Survey form as a stepper.
// Only the Lead Surveyor can change it. Everyone else sees all steps read-only.
@Component({
  selector: 'qfin-branch-survey-form',
  imports: [
    FormField,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    LucideDynamicIcon,
    DatePipe,
    GeographicStep,
    AccessibilityStep,
    DemographicStep,
    EconomicStep,
    MarketBusinessStep,
    FinancialCompetitionStep,
    RiskStep,
    ComplianceStep,
    SurveyPhotos,
  ],
  providers: [provideNativeDateAdapter(), DatePipe],
  templateUrl: './branch-survey-form.html',
})
export class BranchSurveyFormComponent {
  // ===========================
  // Dependency Injection
  // ===========================
  private readonly branchSurveyStore = inject(BranchSurveyStore);
  private readonly branchSurveyService = inject(BranchSurveyService);
  private readonly surveyStore = inject(SurveyStore);
  private readonly alertService = inject(AlertService);
  private readonly dateAdapter = inject(DateAdapter<Date>);
  private readonly datePipe = inject(DatePipe);

  // ===========================
  // Inputs
  // ===========================
  readonly surveyId = input<string>(EMPTY_UUID);
  // "View Form" opens the form read-only, even for the Lead Surveyor. "Complete" opens it for filling in.
  readonly viewOnly = input<boolean>(false);

  // ===========================
  // Outputs
  // ===========================
  readonly back = output<void>();

  // ===========================
  // Component State
  // ===========================
  readonly stepLabels = [
    'Geographic',
    'Accessibility',
    'Demographic',
    'Economic',
    'Market & Business',
    'Financial & Competition',
    'Risk',
    'Compliance & Sign-off',
  ];
  readonly activeStepIndex = signal(0);
  readonly lastStepIndex = this.stepLabels.length - 1;
  readonly isLastStep = computed(() => this.activeStepIndex() === this.lastStepIndex);

  readonly response = this.branchSurveyStore.branchSurvey;
  readonly loading = this.branchSurveyStore.loading;
  // The server decides who may edit. "View Form" always shows the form read-only.
  readonly canEdit = computed(() => !this.viewOnly() && this.branchSurveyStore.canEditForm());

  // Tells a user who cannot edit why.
  readonly readOnlyMessage = computed(() => {
    const status = this.response()?.status;
    if (status !== 'Assigned' && status !== 'Draft') {
      return 'The survey form is submitted and cannot be changed.';
    }
    if (this.branchSurveyStore.canEditForm()) {
      return 'You are viewing the form. Use the Complete button on the survey screen to fill it in.';
    }
    return 'You can view this form. Only the Lead Surveyor can fill it in.';
  });

  // ===========================
  // Form
  // ===========================
  protected readonly formModel = signal<IBranchSurveyForm>(createEmptyBranchSurveyForm());
  protected readonly surveySchema: Schema<IBranchSurveyForm> = schema((path) => {
    // Making the whole form readonly also makes every field inside it readonly.
    readonly(path, { when: () => !this.canEdit() });
    // The Geo Tag is filled in automatically from latitude and longitude, so nobody types it.
    readonly(path.geographic.geoTag);
    required(path.surveyDate, { message: 'Date of survey is required' });
    required(path.geographic.administrativeUnitId, { message: 'Area is required' });

    // Every field of the server submit check is mandatory. Each one shows "<label> is required" under it.
    const mandatory: [SchemaPath<any>, string][] = [
      // A. Geographic
      [path.geographic.proposedOperationalArea, 'Proposed operational area'],
      [path.geographic.policeStation, 'Police station'],
      [path.geographic.pinCode, 'PIN code'],
      [path.geographic.latitude, 'Latitude'],
      [path.geographic.longitude, 'Longitude'],
      [path.geographic.nearestLandmark, 'Nearest landmark'],
      [path.geographic.administrativeStatus, 'Administrative status'],
      [path.geographic.distanceFromExistingWeGrowBranch, 'Distance from existing WeGrow branch'],
      [path.geographic.distanceFromDistrictHeadquarters, 'Distance from district headquarters'],
      // B. Accessibility
      [path.accessibility.roadCondition, 'Road condition'],
      [path.accessibility.publicTransportAvailability, 'Public transport availability'],
      [path.accessibility.railwayConnectivity, 'Railway connectivity'],
      [path.accessibility.busConnectivity, 'Bus connectivity'],
      [path.accessibility.mobileNetworkCoverage, 'Mobile network coverage'],
      [path.accessibility.internetAvailability, 'Internet availability'],
      [path.accessibility.electricitySupply, 'Electricity supply'],
      [path.accessibility.drinkingWaterAvailability, 'Drinking water availability'],
      [path.accessibility.safetyOfArea, 'Safety of area'],
      // F. Transportation
      [path.transportation.railConnectivity, 'Rail connectivity'],
      [path.transportation.busConnectivityAvailable, 'Bus connectivity'],
      [path.transportation.autoTotoAvailability, 'Auto / Toto availability'],
      [path.transportation.roadAccessibility, 'Road accessibility'],
      [path.transportation.accessibilityByMotorCycle, 'Motorcycle accessibility'],
      // C. Demographic
      [path.demographic.estimatedPopulation, 'Estimated population'],
      [path.demographic.numberOfHouseholds, 'Number of households'],
      [path.demographic.averageFamilySize, 'Average family size'],
      [path.demographic.femalePopulationPercent, 'Female population'],
      [path.demographic.literacyRate, 'Literacy rate'],
      [path.demographic.workingPopulation, 'Working population'],
      [path.demographic.minorityPopulationPercent, 'Minority population'],
      [path.demographic.scheduledCastePercent, 'Scheduled caste'],
      [path.demographic.scheduledTribePercent, 'Scheduled tribe'],
      [path.demographic.migrationTrend, 'Migration trend'],
      // D. Economic
      [path.economic.agriculturePercent, 'Agriculture'],
      [path.economic.agriculturalLabour, 'Agricultural labour'],
      [path.economic.dairyLivestock, 'Dairy / livestock'],
      [path.economic.smallBusiness, 'Small business'],
      [path.economic.pettyTrade, 'Petty trade'],
      [path.economic.cottageSmallIndustries, 'Cottage / small industries'],
      [path.economic.transportActivities, 'Transport activities'],
      [path.economic.serviceHolders, 'Service holders'],
      [path.economic.dailyWageEarners, 'Daily wage earners'],
      [path.economic.overallEconomicCondition, 'Overall economic condition'],
      // E. Market potential
      [path.marketPotential.eligibleHouseholds, 'Eligible households'],
      [path.marketPotential.potentialWomenBorrowers, 'Potential women borrowers'],
      [path.marketPotential.jlgPotential, 'JLG potential'],
      [path.marketPotential.individualBusinessLoansExpected, 'Individual business loans'],
      [path.marketPotential.portfolioYear1, 'Expected portfolio - year 1'],
      [path.marketPotential.portfolioYear2, 'Expected portfolio - year 2'],
      [path.marketPotential.portfolioYear3, 'Expected portfolio - year 3'],
      // I. Business potential
      [path.businessPotential.estimatedEligibleHouseholds, 'Estimated eligible households'],
      [path.businessPotential.estimatedWomenBorrowers, 'Estimated women borrowers'],
      [path.businessPotential.estimatedNumberOfJlgCentres, 'Estimated number of JLG centres'],
      [path.businessPotential.estimatedLoanPortfolioPotential, 'Estimated loan portfolio potential'],
      [path.businessPotential.expectedMonthlyDisbursement, 'Expected monthly disbursement'],
      [path.businessPotential.estimatedCollectionEfficiency, 'Estimated collection efficiency'],
      // G. Financial inclusion
      [path.financialInclusion.numberOfBanks, 'Number of banks'],
      [path.financialInclusion.numberOfRegionalRuralBanks, 'Number of regional rural banks'],
      [path.financialInclusion.numberOfCooperativeBanks, 'Number of cooperative banks'],
      [path.financialInclusion.bankingCorrespondents, 'Banking correspondents'],
      [path.financialInclusion.atms, 'ATMs'],
      [path.financialInclusion.digitalPaymentAcceptance, 'Digital payment acceptance'],
      // J. Risk
      [path.risk.floodRisk, 'Flood risk'],
      [path.risk.cycloneRisk, 'Cyclone risk'],
      [path.risk.landslideRisk, 'Landslide risk'],
      [path.risk.droughtRisk, 'Drought risk'],
      [path.risk.politicalDisturbanceRisk, 'Political disturbance risk'],
      [path.risk.communalIssuesRisk, 'Communal issues risk'],
      [path.risk.migrationRisk, 'Migration risk'],
      [path.risk.multipleLendingRisk, 'Multiple lending risk'],
      [path.risk.collectionRisk, 'Collection risk'],
      [path.risk.fraudRisk, 'Fraud risk'],
      [path.risk.competitionRisk, 'Competition risk'],
      // K. Compliance
      [path.compliance.areaVisitedPhysically, 'Area visited physically'],
      [path.compliance.gpsVerified, 'GPS verified'],
      [path.compliance.localReferencesVerified, 'Local references verified'],
      [path.compliance.existingCustomersContacted, 'Existing customers contacted'],
      [path.compliance.competitorVerificationCompleted, 'Competitor verification completed'],
      [path.compliance.photographsAttached, 'Photographs attached'],
      // L and M. Recommendation and comments
      [path.recommendation, 'Recommendation'],
      [path.surveyorComments, 'Comments'],
    ];
    for (const [field, label] of mandatory) {
      required(field, { message: `${label} is required`, when: () => this.canEdit() });
    }

    // The nine income activity shares are parts of one whole, so together they can be 100 at most.
    validate(path.economic, ({ value }) =>
      sumOfActivityShares(value()) > 100
        ? { kind: 'activityTotal', message: ACTIVITY_TOTAL_MESSAGE }
        : undefined,
    );

    // Every percentage must be between 0 and 100.
    const percentMessage = 'Enter a value between 0 and 100';
    const percentFields = [
      path.demographic.femalePopulationPercent,
      path.demographic.literacyRate,
      path.demographic.minorityPopulationPercent,
      path.demographic.scheduledCastePercent,
      path.demographic.scheduledTribePercent,
      path.economic.agriculturePercent,
      path.economic.agriculturalLabour,
      path.economic.dairyLivestock,
      path.economic.smallBusiness,
      path.economic.pettyTrade,
      path.economic.cottageSmallIndustries,
      path.economic.transportActivities,
      path.economic.serviceHolders,
      path.economic.dailyWageEarners,
      path.businessPotential.estimatedCollectionEfficiency,
    ];
    for (const percentField of percentFields) {
      min(percentField, 0, { message: percentMessage });
      max(percentField, 100, { message: percentMessage });
    }
    applyEach(path.competitors, (competitor) => {
      min(competitor.parPercent, 0, { message: percentMessage });
      max(competitor.parPercent, 100, { message: percentMessage });
    });
  });
  protected readonly surveyForm = form(this.formModel, this.surveySchema);

  constructor() {
    this.dateAdapter.setLocale('en-GB');

    effect(() => {
      this.branchSurveyStore.setSurveyId(this.surveyId());
    });

    // Fill the form when the server data arrives (and again after every save).
    effect(() => {
      const response = this.response();
      if (!response) {
        return;
      }

      this.formModel.set(this.toFormModel(response.form));
    });
  }

  // The server sends null for empty text. Text boxes in the form need '' instead.
  private toFormModel(data: IBranchSurveyResponse['form']): IBranchSurveyForm {
    return {
      ...data,
      surveyDate: new Date(data.surveyDate),
      geographic: {
        ...data.geographic,
        proposedOperationalArea: data.geographic.proposedOperationalArea ?? '',
        pinCode: data.geographic.pinCode ?? '',
        geoTag: data.geographic.geoTag ?? '',
        nearestLandmark: data.geographic.nearestLandmark ?? '',
      },
      economic: {
        ...data.economic,
        otherIncomeGeneratingActivities: data.economic.otherIncomeGeneratingActivities ?? '',
        mainCrop: data.economic.mainCrop ?? '',
        peakBusinessSeason: data.economic.peakBusinessSeason ?? '',
        leanSeason: data.economic.leanSeason ?? '',
      },
      surveyorComments: data.surveyorComments ?? '',
    };
  }

  protected onBack() {
    this.back.emit();
  }

  // ===========================
  // Step Navigation
  // ===========================
  protected onStepChange(index: number) {
    this.activeStepIndex.set(index);
  }

  protected goPrevious() {
    this.activeStepIndex.update((index) => Math.max(index - 1, 0));
  }

  protected goNext() {
    this.activeStepIndex.update((index) => Math.min(index + 1, this.lastStepIndex));
  }

  // ===========================
  // Step Validation
  // ===========================
  // The form sections that belong to each step (same order as the stepper).
  private stepSections(index: number): StepSection[] {
    const form = this.surveyForm;
    switch (index) {
      case 0:
        return [form.geographic];
      case 1:
        return [form.accessibility, form.transportation];
      case 2:
        return [form.demographic];
      case 3:
        return [form.economic];
      case 4:
        return [form.marketPotential, form.businessPotential];
      case 5:
        return [form.financialInclusion, form.competitors];
      case 6:
        return [form.risk];
      default:
        return [form.compliance, form.recommendation, form.surveyorComments];
    }
  }

  private isStepValid(index: number): boolean {
    return this.stepSections(index).every((section) => section().valid());
  }

  // True when the step is complete. If not, the red errors and an alert are shown.
  private checkStep(index: number): boolean {
    if (this.isStepValid(index)) {
      return true;
    }

    this.stepSections(index).forEach((section) => section().markAsTouched());
    this.alertService.error('Oops ....', 'Please fill in all required fields of this step.');
    return false;
  }

  // ===========================
  // Save and Submit
  // ===========================
  // One button for the Lead Surveyor: save the form, then go to the next step.
  // People who can only view the form just move to the next step.
  protected saveAndNext() {
    if (!this.canEdit()) {
      this.goNext();
      return;
    }

    this.saveForm((message) => {
      // Move to the next step after the user closes the success message.
      this.alertService.success('Success', message).then(() => this.goNext());
    });
  }

  // Last step, Lead Surveyor only: send the survey to the Survey Committee.
  protected submitSurvey() {
    // Every step must be complete. Jump to the first one that is not.
    for (let index = 0; index <= this.lastStepIndex; index++) {
      if (!this.isStepValid(index)) {
        this.activeStepIndex.set(index);
        this.checkStep(index);
        return;
      }
    }

    this.alertService
      .confirm(
        'Confirmation',
        'Do you want to submit this survey to the Survey Committee? You cannot change it after it is submitted.',
      )
      .then((result) => {
        if (!result.isConfirmed) {
          return;
        }

        // Save the latest changes first, so the committee sees exactly what is on the screen.
        this.saveForm(() => {
          this.branchSurveyService.submit(this.surveyId()).subscribe({
            next: (resp: any) => {
              this.alertService.success('Success', resp).then(() => {
                this.refreshAfterChange();
                // The survey is locked now, so go back to the survey details.
                this.back.emit();
              });
            },
          });
        });
      });
  }

  // Saves the whole form as a draft. After it is saved, onSaved gets the server message.
  private saveForm(onSaved: (message: string) => void) {
    // A draft only needs the current step to be complete.
    if (!this.checkStep(this.activeStepIndex())) {
      return;
    }

    // The date and the area are always required. "Required" errors of other steps do not block a draft.
    const headerField = [this.surveyForm.surveyDate, this.surveyForm.geographic.administrativeUnitId].find(
      (field) => !field().valid(),
    );
    const otherError = this.surveyForm()
      .errorSummary()
      .find((error) => error.kind !== 'required');
    if (headerField || otherError) {
      // Show the first problem found, for example "Enter a value between 0 and 100".
      const message = headerField?.().errors()[0]?.message ?? otherError?.message;
      this.alertService.error('Oops ....', message ?? 'Please check the form and try again.');
      return;
    }

    const model = this.formModel();
    const payload = {
      ...model,
      surveyDate: this.datePipe.transform(model.surveyDate, 'yyyy-MM-dd'),
    };
    // Text boxes that were cleared are sent as empty (null) instead of ''.
    const body = JSON.parse(JSON.stringify(payload, (_key, value) => (value === '' ? null : value)));

    this.branchSurveyService.saveDraft(this.surveyId(), body).subscribe({
      next: (resp: any) => {
        this.refreshAfterChange();
        onSaved(resp);
      },
    });
  }

  // The first save changes the survey status to Draft and a submit changes it again,
  // so the form and the survey screens are reloaded.
  private refreshAfterChange() {
    this.branchSurveyStore.refresh();
    this.surveyStore.refreshList();
    this.surveyStore.refreshDetail();
  }
}
