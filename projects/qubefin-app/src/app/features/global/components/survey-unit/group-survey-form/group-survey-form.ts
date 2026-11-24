import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { form, FormField, min, readonly, required, schema, Schema } from '@angular/forms/signals';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import {
  createEmptyGroupSurveyForm,
  GROUP_SURVEY_OPTIONS,
  IGroupSurveyForm,
  IGroupSurveyResponse,
} from '../../../models/group-survey';
import { GroupSurveyService } from '../../../services/group-survey-service';
import { GroupSurveyStore } from '../../../stores/group-survey-store';
import { SurveyStore } from '../../../stores/survey-store';

// A dropdown or number field of the form, described once and drawn by the template.
interface SelectField {
  key: string;
  label: string;
  icon: string;
  options: string[];
}
interface NumberField {
  key: string;
  label: string;
  icon: string;
  suffix?: string;
}

// The Group Formation Survey form as a stepper.
// Only the Lead Credit Officer can change it. Everyone else sees all steps read-only.
@Component({
  selector: 'qfin-group-survey-form',
  imports: [
    FormField,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    LucideDynamicIcon,
    DatePipe,
  ],
  providers: [provideNativeDateAdapter(), DatePipe],
  templateUrl: './group-survey-form.html',
})
export class GroupSurveyFormComponent {
  private readonly groupSurveyStore = inject(GroupSurveyStore);
  private readonly groupSurveyService = inject(GroupSurveyService);
  private readonly surveyStore = inject(SurveyStore);
  private readonly alertService = inject(AlertService);
  private readonly dateAdapter = inject(DateAdapter<Date>);
  private readonly datePipe = inject(DatePipe);

  readonly surveyId = input<string>(EMPTY_UUID);
  // "View Form" opens the form read-only, even for the Lead Credit Officer. "Complete" opens it for filling in.
  readonly viewOnly = input<boolean>(false);
  readonly back = output<void>();

  // ===========================
  // Steps and fields
  // ===========================
  readonly stepLabels = [
    'Geographic',
    'Profile',
    'Environment',
    'Risk & Competition',
    'Distance & Potential',
    'Observations & Sign-off',
  ];
  readonly activeStepIndex = signal(0);
  readonly lastStepIndex = this.stepLabels.length - 1;
  readonly isLastStep = computed(() => this.activeStepIndex() === this.lastStepIndex);

  readonly occupationOptions = GROUP_SURVEY_OPTIONS.mainOccupation;
  readonly recommendationOptions = GROUP_SURVEY_OPTIONS.recommendation;

  readonly environmentFields: SelectField[] = [
    { key: 'roadAccessibility', label: 'Road Accessibility', icon: 'route', options: GROUP_SURVEY_OPTIONS.yesNo },
    { key: 'autoTotoAvailability', label: 'Auto / Toto Availability', icon: 'route', options: GROUP_SURVEY_OPTIONS.yesNo },
    { key: 'communityHarmony', label: 'Community Harmony', icon: 'users', options: GROUP_SURVEY_OPTIONS.goodModeratePoor },
    { key: 'womenEconomicParticipation', label: "Women's Participation in Economic Activities", icon: 'users', options: GROUP_SURVEY_OPTIONS.goodModeratePoor },
    { key: 'socialAcceptanceOfMicrofinance', label: 'Social Acceptance of Microfinance', icon: 'users', options: GROUP_SURVEY_OPTIONS.goodModeratePoor },
    { key: 'politicalStability', label: 'Political Stability', icon: 'shield-alert', options: GROUP_SURVEY_OPTIONS.stableModerateSensitive },
    { key: 'politicalDisturbance', label: 'Any Political Disturbance', icon: 'shield-alert', options: GROUP_SURVEY_OPTIONS.stableModerateSensitive },
    { key: 'localInfluenceOnLending', label: 'Local Influence on Lending Activities', icon: 'shield-alert', options: GROUP_SURVEY_OPTIONS.stableModerateSensitive },
    { key: 'electionRelatedIssues', label: 'Election-related Issues', icon: 'shield-alert', options: GROUP_SURVEY_OPTIONS.stableModerateSensitive },
  ];
  readonly climateFields: SelectField[] = [
    { key: 'floodProne', label: 'Flood Prone Area', icon: 'triangle-alert', options: GROUP_SURVEY_OPTIONS.yesNo },
    { key: 'waterLogging', label: 'Water Logging', icon: 'triangle-alert', options: GROUP_SURVEY_OPTIONS.yesNo },
    { key: 'droughtProne', label: 'Drought Prone', icon: 'triangle-alert', options: GROUP_SURVEY_OPTIONS.yesNo },
    { key: 'flashFloodRisk', label: 'Flash Flood Risk', icon: 'triangle-alert', options: GROUP_SURVEY_OPTIONS.yesNo },
    { key: 'cycloneRisk', label: 'Cyclone Risk', icon: 'triangle-alert', options: GROUP_SURVEY_OPTIONS.yesNo },
    { key: 'riverErosion', label: 'River Erosion', icon: 'triangle-alert', options: GROUP_SURVEY_OPTIONS.yesNo },
    { key: 'otherNaturalRisks', label: 'Other Natural Risks', icon: 'triangle-alert', options: GROUP_SURVEY_OPTIONS.yesNo },
  ];
  readonly competitionFields: NumberField[] = [
    { key: 'numberOfMfis', label: 'Number of MFIs Operating', icon: 'building-2' },
    { key: 'smallFinanceBanks', label: 'Small Finance Banks', icon: 'building-2' },
    { key: 'shgFinancingInstitutions', label: 'SHG Financing Institutions', icon: 'building-2' },
  ];
  readonly distanceFields: NumberField[] = [
    { key: 'distanceFromBranchKm', label: 'Distance from the Branch', icon: 'route', suffix: 'km' },
    { key: 'distanceFromNearestWeGrowCentreKm', label: 'Distance from Nearest Existing WeGrow Centre', icon: 'route', suffix: 'km' },
    { key: 'distanceFromNearestCompetingCentreKm', label: 'Distance from Nearest Competing Centre', icon: 'route', suffix: 'km' },
    { key: 'averageTravelTimeMinutes', label: 'Average Travel Time', icon: 'clock-3', suffix: 'min' },
  ];
  readonly potentialFields: NumberField[] = [
    { key: 'groupsThatCanBeFormed', label: 'How many Groups can be formed?', icon: 'users' },
    { key: 'estimatedWomenBorrowers', label: 'Estimated Women Borrowers', icon: 'users' },
  ];

  // ===========================
  // State from the server
  // ===========================
  readonly response = this.groupSurveyStore.groupSurvey;
  readonly loading = this.groupSurveyStore.loading;
  // The server decides who may edit. "View Form" always shows the form read-only.
  readonly canEdit = computed(() => !this.viewOnly() && this.groupSurveyStore.canEditForm());

  readonly readOnlyMessage = computed(() => {
    const status = this.response()?.status;
    if (status !== 'Assigned' && status !== 'Draft') {
      return 'The survey form is submitted and cannot be changed.';
    }
    if (this.groupSurveyStore.canEditForm()) {
      return 'You are viewing the form. Use the Complete button on the survey screen to fill it in.';
    }
    return 'You can view this form. Only the Lead Credit Officer can fill it in.';
  });

  // ===========================
  // Form
  // ===========================
  protected readonly formModel = signal<IGroupSurveyForm>(createEmptyGroupSurveyForm());
  protected readonly surveySchema: Schema<IGroupSurveyForm> = schema((path) => {
    // Making the whole form readonly also makes every field inside it readonly.
    readonly(path, { when: () => !this.canEdit() });
    // These come from the survey assignment, so nobody types them.
    readonly(path.geographic.proposedOperationalArea);
    readonly(path.geographic.villageLocality);
    readonly(path.geographic.gramPanchayatMunicipality);
    readonly(path.geographic.block);
    required(path.surveyDate, { message: 'Date of survey is required' });

    // Counts, distances and times cannot be negative.
    const notNegative = 'Enter a value of 0 or more';
    const numberFields = [
      path.profile.approximateHouseholds,
      path.profile.estimatedPopulation,
      path.risk.numberOfMfis,
      path.risk.smallFinanceBanks,
      path.risk.shgFinancingInstitutions,
      path.market.distanceFromBranchKm,
      path.market.distanceFromNearestWeGrowCentreKm,
      path.market.distanceFromNearestCompetingCentreKm,
      path.market.averageTravelTimeMinutes,
      path.market.groupsThatCanBeFormed,
      path.market.estimatedWomenBorrowers,
    ];
    for (const numberField of numberFields) {
      min(numberField, 0, { message: notNegative });
    }
  });
  protected readonly surveyForm = form(this.formModel, this.surveySchema);

  constructor() {
    this.dateAdapter.setLocale('en-GB');

    effect(() => {
      this.groupSurveyStore.setSurveyId(this.surveyId());
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
  private toFormModel(data: IGroupSurveyResponse['form']): IGroupSurveyForm {
    return {
      ...data,
      surveyDate: new Date(data.surveyDate),
      geographic: {
        ...data.geographic,
        proposedOperationalArea: data.geographic.proposedOperationalArea ?? '',
        villageLocality: data.geographic.villageLocality ?? '',
        gramPanchayatMunicipality: data.geographic.gramPanchayatMunicipality ?? '',
        block: data.geographic.block ?? '',
        nearestLandmark: data.geographic.nearestLandmark ?? '',
      },
      profile: {
        ...data.profile,
        mainOccupationOther: data.profile.mainOccupationOther ?? '',
      },
      observation: {
        ...data.observation,
        otherObservations: data.observation.otherObservations ?? '',
        surveyorComments: data.observation.surveyorComments ?? '',
      },
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

  // Fills the latitude and longitude from the browser location.
  protected useCurrentLocation() {
    if (!navigator.geolocation) {
      this.alertService.error('Oops ....', 'Your browser does not support location.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.surveyForm.geographic.latitude().value.set(Number(position.coords.latitude.toFixed(6)));
        this.surveyForm.geographic.longitude().value.set(Number(position.coords.longitude.toFixed(6)));
      },
      () => {
        this.alertService.error(
          'Oops ....',
          'Could not get your location. Please allow location access or enter it manually.',
        );
      },
    );
  }

  // ===========================
  // Save and Submit
  // ===========================
  // One button for the Lead Credit Officer: save the form, then go to the next step.
  // People who can only view the form just move to the next step.
  protected saveAndNext() {
    if (!this.canEdit()) {
      this.goNext();
      return;
    }

    this.saveForm((message) => {
      this.alertService.success('Success', message).then(() => this.goNext());
    });
  }

  // Last step, Lead Credit Officer only: send the survey to the Head of the branch.
  protected submitSurvey() {
    this.alertService
      .confirm(
        'Confirmation',
        'Do you want to submit this survey to the Head of the branch? You cannot change it after it is submitted.',
      )
      .then((result) => {
        if (!result.isConfirmed) {
          return;
        }

        // Save the latest changes first, so the reviewer sees exactly what is on the screen.
        this.saveForm(() => {
          this.groupSurveyService.submit(this.surveyId()).subscribe({
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
    if (!this.surveyForm().valid()) {
      const firstError = this.surveyForm().errorSummary()[0]?.message;
      this.alertService.error('Oops ....', firstError ?? 'Please check the form and try again.');
      return;
    }

    const model = this.formModel();
    const payload = {
      ...model,
      surveyDate: this.datePipe.transform(model.surveyDate, 'yyyy-MM-dd'),
    };
    // Text boxes that were cleared are sent as empty (null) instead of ''.
    const body = JSON.parse(JSON.stringify(payload, (_key, value) => (value === '' ? null : value)));

    this.groupSurveyService.saveDraft(this.surveyId(), body).subscribe({
      next: (resp: any) => {
        this.refreshAfterChange();
        onSaved(resp);
      },
    });
  }

  // The first save changes the survey status to Draft and a submit changes it again,
  // so the form and the survey screens are reloaded.
  private refreshAfterChange() {
    this.groupSurveyStore.refresh();
    this.surveyStore.refreshList();
    this.surveyStore.refreshDetail();
  }
}
