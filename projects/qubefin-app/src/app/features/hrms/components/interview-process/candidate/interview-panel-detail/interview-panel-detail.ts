import { Component, inject, input, output, signal, OnInit, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { disabled, form, FormField, schema, Schema } from '@angular/forms/signals';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { EMPTY_UUID, AlertService, ApiPaths } from 'qubefin-core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { HrmsReportService } from '../../../../../Report/Service/hrms-report-service';

export interface IAssessmentModel {
  appearanceAttitudeRating: number;
  appearanceAttitudeRemarks: string;
  personalityRating: number;
  personalityRemarks: string;
  communicationRating: number;
  communicationRemarks: string;
  educationRating: number;
  educationRemarks: string;
  workExperienceRating: number;
  workExperienceRemarks: string;
  technicalCompetenceRating: number;
  technicalCompetenceRemarks: string;
  flexibilityRating: number;
  flexibilityRemarks: string;
  ambitionRating: number;
  ambitionRemarks: string;
  potentialRating: number;
  potentialRemarks: string;
  othersRating: number;
  othersRemarks: string;
  anyOtherJobsSuitedRemarks: string;
  isRecommendedForPosition: boolean;
  positiveRemarks: string;
  negativeRemarks: string;
}

/** Config-driven rating rows so the template doesn't repeat 10 near-identical blocks */
export interface IRatingFieldConfig {
  key: string; // base key, e.g. 'appearanceAttitude'
  label: string;
  desc: string;
}

export const RATING_FIELDS: IRatingFieldConfig[] = [
  {
    key: 'appearanceAttitude',
    label: 'Appearance & Attitude',
    desc: 'Grooming, courtesy, appropriate dress',
  },
  { key: 'personality', label: 'Personality', desc: 'Dignity, bearing, rapport, process, manner' },
  { key: 'communication', label: 'Communication', desc: 'Ability to adequately express oneself' },
  { key: 'education', label: 'Education', desc: 'Appropriateness of degree and course work' },
  { key: 'workExperience', label: 'Work Experience', desc: 'Related work experience for the job' },
  {
    key: 'technicalCompetence',
    label: 'Technical Competence',
    desc: 'Appropriateness of technical skills',
  },
  {
    key: 'flexibility',
    label: 'Flexibility',
    desc: 'Responsive to change, tolerance for ambiguity',
  },
  { key: 'ambition', label: 'Ambition', desc: 'In line with anticipated job program' },
  { key: 'potential', label: 'Potential', desc: 'Ability and motivation to grow' },
  { key: 'others', label: 'Others', desc: 'Anything else worth noting' },
];

export const RATING_OPTIONS = [
  { value: 0, label: 'NA', full: 'Not Acceptable' },
  { value: 1, label: 'BA', full: 'Below Average' },
  { value: 2, label: 'A', full: 'Average' },
  { value: 3, label: 'G', full: 'Good' },
  { value: 4, label: 'VG', full: 'Very Good' },
  { value: 5, label: 'O', full: 'Outstanding' },
];

import { InterviewPanelService } from '../../../../services/interview-panel-service';
import { InterviewPanelStore } from '../../../../stores/interview-panel-store';
import { OrganizationUnitTypeStore } from '../../../../../global/stores/organization-unit-type-store';
import { OrganizationUnitService } from '../../../../../global/services/organization-unit-service';
import { OrganizationUnit } from '../../../../../global/models/organization-unit';
import { IInterviewAssessmentDto } from '../../../../models/interview-panel';
import { SessionService } from '../../../../../../services/session.service';

import { EmployeeStore } from '../../../../stores/employee-store';

@Component({
  selector: 'qfin-interview-panel-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatAutocompleteModule,
    MatDatepickerModule,
    MatNativeDateModule,
    ReactiveFormsModule,
    LucideDynamicIcon,
    FormField,
    MatDialogModule,
  ],
  providers: [provideNativeDateAdapter(), DatePipe],
  templateUrl: './interview-panel-detail.html',
})
export class InterviewPanelDetail implements OnInit {
  private readonly panelService = inject(InterviewPanelService);
  private readonly hrReportService = inject(HrmsReportService);
  private readonly alertService = inject(AlertService);
  private readonly panelStore = inject(InterviewPanelStore);
  private readonly dialog = inject(MatDialog);
  private readonly dateAdapter = inject(DateAdapter<Date>);
  private readonly datePipe = inject(DatePipe);
  private readonly organizationUnitTypeStore = inject(OrganizationUnitTypeStore);
  private readonly organizationUnitService = inject(OrganizationUnitService);
  private readonly employeeStore = inject(EmployeeStore);
  private readonly sessionService = inject(SessionService);

  readonly organizationUnitTypes = this.organizationUnitTypeStore.organizationUnitTypes;
  organizationUnits = signal<OrganizationUnit[]>([]);
  readonly employeeList = this.employeeStore.employeesByOrgUnit;
  selectedPanelists = signal<any[]>([]);

  // --- Employee search filter (interactive) ---
  employeeSearchTerm = signal<string>('');
  readonly filteredEmployeeList = computed(() => {
    const term = this.employeeSearchTerm().trim().toLowerCase();
    const list = this.employeeList() ?? [];
    if (!term) return list;
    return list.filter(
      (e: any) =>
        e.name?.toLowerCase().includes(term) ||
        e.code?.toLowerCase().includes(term) ||
        e.currentDesignation?.toLowerCase().includes(term),
    );
  });

  onEmployeeSearchChange(value: string) {
    this.employeeSearchTerm.set(value);
  }

  organizationUnitTypeId = new FormControl('');
  organizationUnitId = new FormControl('');

  // readonly panelId = input<string>(EMPTY_UUID);
  readonly isAssessmentMode = input<boolean>(false);
  readonly isViewMode = input<boolean>(false);
  readonly candidateIdForPanel = input<string>(EMPTY_UUID);
  readonly interviewDate = input<string>('');
  readonly interviewTime = input<string>('');

  panelDetails = signal<any[]>([]);
  loadingPanels = signal<boolean>(false);

  readonly canModifyPanel = computed(() => {
    return !this.panelDetails().some((p: any) => p.isAttened);
  });

  // --- Toggle for "Add More Panelists" section (interactive, collapsed by default) ---
  showAddPanelists = signal<boolean>(false);
  toggleAddPanelists() {
    this.showAddPanelists.update((v) => !v);
  }

  readonly cancel = output<void>();
  readonly save = output<void>();

  // --- Assessment Form ---
  protected readonly assessmentModel = signal<IAssessmentModel>({
    appearanceAttitudeRating: 0,
    appearanceAttitudeRemarks: '',
    personalityRating: 0,
    personalityRemarks: '',
    communicationRating: 0,
    communicationRemarks: '',
    educationRating: 0,
    educationRemarks: '',
    workExperienceRating: 0,
    workExperienceRemarks: '',
    technicalCompetenceRating: 0,
    technicalCompetenceRemarks: '',
    flexibilityRating: 0,
    flexibilityRemarks: '',
    ambitionRating: 0,
    ambitionRemarks: '',
    potentialRating: 0,
    potentialRemarks: '',
    othersRating: 0,
    othersRemarks: '',
    anyOtherJobsSuitedRemarks: '',
    isRecommendedForPosition: true,
    positiveRemarks: '',
    negativeRemarks: '',
  });

  protected readonly assessmentSchema: Schema<IAssessmentModel> = schema((path) => {
    disabled(path.anyOtherJobsSuitedRemarks, { when: () => this.isAssessmentLocked() });
    disabled(path.positiveRemarks, { when: () => this.isAssessmentLocked() });
    disabled(path.negativeRemarks, { when: () => this.isAssessmentLocked() });
  });

  protected readonly assessmentForm = form(this.assessmentModel, this.assessmentSchema);

  readonly ratingFields = RATING_FIELDS;
  readonly ratingOptions = RATING_OPTIONS;

  // --- Existing assessment (own draft/submission), loaded by CandidateId + EmployeeId ---
  readonly existingAssessment = signal<IInterviewAssessmentDto | null>(null);
  readonly loadingAssessment = signal<boolean>(false);
  readonly savingDraft = signal<boolean>(false);

  /** Once the panelist has finally submitted, the form is read-only - matches the backend rule. */
  readonly isAssessmentLocked = computed(() => !!this.existingAssessment()?.isSubmitted);

  /** Live running total out of 50, drives the header progress indicator */
  readonly totalRatingScore = computed(() => {
    const m: any = this.assessmentModel();
    return this.ratingFields.reduce((sum, f) => sum + (Number(m[`${f.key}Rating`]) || 0), 0);
  });
  readonly maxRatingScore = computed(() => this.ratingFields.length * 5);
  readonly totalRatingPercent = computed(() =>
    Math.round((this.totalRatingScore() / this.maxRatingScore()) * 100),
  );

  getRating(key: string): number {
    return (this.assessmentModel() as any)[`${key}Rating`] ?? 0;
  }

  getRemarks(key: string): string {
    return (this.assessmentModel() as any)[`${key}Remarks`] ?? '';
  }

  setRating(key: string, value: number) {
    this.assessmentModel.update((m) => {
      const current = (m as any)[`${key}Rating`];
      // clicking the already-selected value clears the rating back to unset (0)
      const next = current === value ? 0 : value;
      return { ...m, [`${key}Rating`]: next };
    });
  }

  setRemarks(key: string, value: string) {
    this.assessmentModel.update((m) => ({ ...m, [`${key}Remarks`]: value }));
  }

  getInitials(name: string | undefined | null): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('');
  }

  constructor() {
    this.dateAdapter.setLocale('en-GB');

    this.organizationUnitTypeId.valueChanges.subscribe((typeId) => {
      if (typeId) {
        this.onOrganizationUnitTypeChange(typeId);
      } else {
        this.organizationUnits.set([]);
        this.employeeStore.setSearchOrganizationUnitId(null);
      }
    });

    this.organizationUnitId.valueChanges.subscribe((orgId) => {
      if (orgId) {
        this.onOrganizationUnitChange(orgId);
      } else {
        this.employeeStore.setSearchOrganizationUnitId(null);
      }
    });
  }

  ngOnInit() {
    if (this.isViewMode() && this.candidateIdForPanel()) {
      this.fetchPanelDetails();
    }

    if (this.isAssessmentMode() && this.candidateIdForPanel()) {
      this.fetchExistingAssessment();
    }
  }

  /** Loads the current panelist's own assessment (draft or submitted) so re-opening the form doesn't lose progress. */
  fetchExistingAssessment() {
    const employeeId = this.sessionService.employeeId;
    if (!employeeId) return;

    this.loadingAssessment.set(true);
    this.panelService
      .getAssessmentByCandidateAndEmployee(this.candidateIdForPanel(), employeeId)
      .subscribe({
        next: (res) => {
          this.existingAssessment.set(res);
          this.loadingAssessment.set(false);

          if (!res) return;

          this.assessmentModel.set({
            appearanceAttitudeRating: res.appearanceAttitudeRating ?? 0,
            appearanceAttitudeRemarks: res.appearanceAttitudeRemarks ?? '',
            personalityRating: res.personalityRating ?? 0,
            personalityRemarks: res.personalityRemarks ?? '',
            communicationRating: res.communicationRating ?? 0,
            communicationRemarks: res.communicationRemarks ?? '',
            educationRating: res.educationRating ?? 0,
            educationRemarks: res.educationRemarks ?? '',
            workExperienceRating: res.workExperienceRating ?? 0,
            workExperienceRemarks: res.workExperienceRemarks ?? '',
            technicalCompetenceRating: res.technicalCompetenceRating ?? 0,
            technicalCompetenceRemarks: res.technicalCompetenceRemarks ?? '',
            flexibilityRating: res.flexibilityRating ?? 0,
            flexibilityRemarks: res.flexibilityRemarks ?? '',
            ambitionRating: res.ambitionRating ?? 0,
            ambitionRemarks: res.ambitionRemarks ?? '',
            potentialRating: res.potentialRating ?? 0,
            potentialRemarks: res.potentialRemarks ?? '',
            othersRating: res.othersRating ?? 0,
            othersRemarks: res.othersRemarks ?? '',
            anyOtherJobsSuitedRemarks: res.anyOtherJobsSuitedRemarks ?? '',
            isRecommendedForPosition: res.isRecommendedForPosition ?? true,
            positiveRemarks: res.positiveRemarks ?? '',
            negativeRemarks: res.negativeRemarks ?? '',
          });
        },
        error: () => {
          // No assessment entry yet for this panelist - keep the blank defaults.
          this.loadingAssessment.set(false);
        },
      });
  }

  fetchPanelDetails() {
    this.loadingPanels.set(true);
    (this.panelService.getPanelsByCandidate(this.candidateIdForPanel()) as any).subscribe({
      next: (res: any) => {
        this.panelDetails.set(res || []);
        this.loadingPanels.set(false);
      },
      error: () => {
        this.loadingPanels.set(false);
        this.alertService.error('Error', 'Failed to fetch panel details');
      },
    });
  }

  onDeletePanelist(employeeId: string) {
    this.alertService
      .confirm(null, 'Are you sure you want to remove this panelist?')
      .then((result) => {
        if (result.isConfirmed) {
          const candidateId = this.candidateIdForPanel();

          this.panelService.removePanelist(candidateId, employeeId).subscribe({
            next: () => {
              this.alertService.success('Success', 'Panelist removed');
              this.fetchPanelDetails(); // refresh list
              this.panelStore.refreshPanels();
              this.save.emit();
            },
            error: () => {
              this.alertService.error('Error', 'Failed to remove panelist');
            },
          });
        }
      });
  }

  onOrganizationUnitTypeChange(typeId: string) {
    if (!typeId || typeId === EMPTY_UUID) return;
    this.organizationUnitService.getOrganizationUnitByType(typeId).subscribe({
      next: (res: any) => {
        this.organizationUnits.set(res);
        this.organizationUnitId.setValue('');
      },
    });
  }

  onOrganizationUnitChange(orgId: string) {
    if (!orgId || orgId === EMPTY_UUID) {
      this.employeeStore.setSearchOrganizationUnitId(null);
      return;
    }

    this.employeeStore.setSearchOrganizationUnitId(orgId);
  }

  togglePanelist(employee: any, isChecked: boolean) {
    const current = this.selectedPanelists();
    if (isChecked) {
      if (!current.find((e) => e.id === employee.id)) {
        this.selectedPanelists.set([...current, employee]);
      }
    } else {
      this.selectedPanelists.set(current.filter((e) => e.id !== employee.id));
    }
  }

  isPanelistSelected(employeeId: string): boolean {
    return !!this.selectedPanelists().find((e) => e.id === employeeId);
  }

  onCancel() {
    this.cancel.emit();
  }

  onSubmitSchedule() {
    if (this.selectedPanelists().length === 0) {
      this.alertService.error('Error', 'Please select at least one panelist.');
      return;
    }

    // Format internal date and time
    const interviewDateRaw = this.interviewDate();
    const formattedDate = interviewDateRaw
      ? this.datePipe.transform(interviewDateRaw, 'yyyy-MM-dd')
      : null;
    const formattedTime = this.normalizeTimeValue(this.interviewTime());

    const commonSchedule = {
      scheduledDate: formattedDate,
      scheduledTime: formattedTime,
    };

    const panelists = this.selectedPanelists().map((emp) => ({
      employeeId: emp.id,
      ...commonSchedule,
    }));

    // View mode + "Add More Panelists" -> adding to an already-existing panel.
    if (this.isViewMode()) {
      this.onAddPanelists(panelists);
      return;
    }

    const candidateId = this.candidateIdForPanel();
    if (!candidateId || candidateId === EMPTY_UUID) {
      this.alertService.error('Error', 'Candidate is required.');
      return;
    }

    this.withAcknowledgement(candidateId, (acknowledgement) =>
      this.panelService.schedulePanel(candidateId, panelists as any, acknowledgement).subscribe({
        next: (message: any) => {
          this.alertService
            .success('Success', typeof message === 'string' ? message : 'Panel Scheduled')
            .then(() => {
              this.panelStore.refreshPanels();
              this.save.emit();
            });
        },
        error: () => {},
      }),
    );
  }

  /** Fetches the interview panel acknowledgement PDF that the API mails to the panelists. If the report fails,
   * the panel is still saved - the mail just goes without the attachment. */
  private withAcknowledgement(candidateId: string, send: (acknowledgement: Blob | null) => void) {
    (this.hrReportService.getInterviewPanelAcknowledgement(candidateId) as any)
      .pipe(catchError(() => of(null)))
      .subscribe((file: Blob | null) => send(file));
  }

  /** Adds the currently selected employees as panelists on a candidate that already has a panel. */
  onAddPanelists(
    panelists: { employeeId: string; scheduledDate: string | null; scheduledTime: string | null }[],
  ) {
    const candidateId = this.candidateIdForPanel();

    this.withAcknowledgement(candidateId, (acknowledgement) =>
      this.panelService.addPanelists(candidateId, panelists as any, acknowledgement).subscribe({
        next: (message: any) => {
          this.alertService
            .success('Success', typeof message === 'string' ? message : 'Panelist(s) added')
            .then(() => {
              this.selectedPanelists.set([]);
              this.showAddPanelists.set(false);
              this.fetchPanelDetails();
              this.panelStore.refreshPanels();
              this.save.emit();
            });
        },
        error: () => this.alertService.error('Error', 'Failed to add panelist(s)'),
      }),
    );
  }

  onSubmitAssessment() {
    if (this.isAssessmentLocked()) {
      this.alertService.error(
        'Error',
        'This assessment has already been submitted and cannot be changed.',
      );
      return;
    }

    this.assessmentForm().markAsTouched();
    if (!this.assessmentForm().valid()) return;

    const assessmentData = {
      candidateId: this.candidateIdForPanel(),
      assessment: this.assessmentForm().value(),
    };

    (this.panelService.submitAssessment(assessmentData) as any).subscribe({
      next: () => {
        this.alertService.success('Success', 'Assessment Submitted').then(() => {
          this.panelStore.refreshPanels();
          this.save.emit();
        });
      },
      error: () => this.alertService.error('Error', 'Failed to submit assessment'),
    });
  }

  /** Saves the in-progress assessment without locking it. Unlike Submit, this keeps the dialog open
   * and marks the panelist as attended on the backend. */
  onSaveAssessmentDraft() {
    if (this.isAssessmentLocked()) {
      this.alertService.error(
        'Error',
        'This assessment has already been submitted and cannot be changed.',
      );
      return;
    }

    const assessmentData = {
      candidateId: this.candidateIdForPanel(),
      assessment: this.assessmentForm().value(),
    };

    this.savingDraft.set(true);
    (this.panelService.saveAssessmentDraft(assessmentData) as any).subscribe({
      next: () => {
        this.savingDraft.set(false);
        this.alertService.success('Success', 'Assessment saved as draft');
        this.panelStore.refreshPanels();
        this.fetchExistingAssessment();
      },
      error: () => {
        this.savingDraft.set(false);
        this.alertService.error('Error', 'Failed to save draft');
      },
    });
  }
  private normalizeTimeValue(value: string | Date | null): string | null {
    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      const normalizedValue = value.trim().replace(/\./g, ':');

      // Handle 12-hour format: 10:30 AM / 02:30 PM
      if (/\b(AM|PM)\b/i.test(normalizedValue)) {
        const parts = normalizedValue.split(/\s+/);
        const timeParts = parts[0].split(':');

        let hour = parseInt(timeParts[0], 10);
        const minute = parseInt(timeParts[1] ?? '0', 10);
        const period = parts[1]?.toUpperCase();

        if (period === 'PM' && hour !== 12) {
          hour += 12;
        }

        if (period === 'AM' && hour === 12) {
          hour = 0;
        }

        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
      }

      // Handle HH:mm or HH:mm:ss
      const timeParts = normalizedValue.split(':');

      const hour = String(timeParts[0]).padStart(2, '0');
      const minute = String(timeParts[1] ?? '0').padStart(2, '0');
      const second = String(timeParts[2] ?? '0').padStart(2, '0');

      return `${hour}:${minute}:${second}`;
    }

    // Date object
    return this.datePipe.transform(value, 'HH:mm:ss') ?? null;
  }
}
