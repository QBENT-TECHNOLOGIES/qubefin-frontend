import { Component, effect, inject, input, output, signal, OnInit, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { form, FormField, schema, Schema } from '@angular/forms/signals';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { EMPTY_UUID, AlertService, ApiPaths } from 'qubefin-core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';

export interface IScheduleModel {
  candidateId: string;
}

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
  { key: 'appearanceAttitude', label: 'Appearance & Attitude', desc: 'Grooming, courtesy, appropriate dress' },
  { key: 'personality', label: 'Personality', desc: 'Dignity, bearing, rapport, process, manner' },
  { key: 'communication', label: 'Communication', desc: 'Ability to adequately express oneself' },
  { key: 'education', label: 'Education', desc: 'Appropriateness of degree and course work' },
  { key: 'workExperience', label: 'Work Experience', desc: 'Related work experience for the job' },
  { key: 'technicalCompetence', label: 'Technical Competence', desc: 'Appropriateness of technical skills' },
  { key: 'flexibility', label: 'Flexibility', desc: 'Responsive to change, tolerance for ambiguity' },
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
  private readonly alertService = inject(AlertService);
  private readonly panelStore = inject(InterviewPanelStore);
  private readonly dialog = inject(MatDialog);
  private readonly dateAdapter = inject(DateAdapter<Date>);
  private readonly datePipe = inject(DatePipe);
  private readonly organizationUnitTypeStore = inject(OrganizationUnitTypeStore);
  private readonly organizationUnitService = inject(OrganizationUnitService);
  private readonly employeeStore = inject(EmployeeStore);

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
        e.currentDesignation?.toLowerCase().includes(term)
    );
  });

  onEmployeeSearchChange(value: string) {
    this.employeeSearchTerm.set(value);
  }

  organizationUnitTypeId = new FormControl('');
  organizationUnitId = new FormControl('');

  readonly panelId = input<string>(EMPTY_UUID);
  readonly isAssessmentMode = input<boolean>(false);
  readonly isViewMode = input<boolean>(false);
  readonly candidateIdForPanel = input<string>('9a7c7f5a-5a41-4e3d-9b4e-123456789abc');
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

  // --- Schedule Panel Form ---
  protected readonly scheduleModel = signal<IScheduleModel>({
    candidateId: '',
  });

  protected readonly scheduleSchema: Schema<IScheduleModel> = schema((path) => { });

  protected readonly scheduleForm = form(this.scheduleModel, this.scheduleSchema);

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

  protected readonly assessmentSchema: Schema<IAssessmentModel> = schema((path) => { });

  protected readonly assessmentForm = form(this.assessmentModel, this.assessmentSchema);

  readonly ratingFields = RATING_FIELDS;
  readonly ratingOptions = RATING_OPTIONS;

  /** Live running total out of 50, drives the header progress indicator */
  readonly totalRatingScore = computed(() => {
    const m: any = this.assessmentModel();
    return this.ratingFields.reduce((sum, f) => sum + (Number(m[`${f.key}Rating`]) || 0), 0);
  });
  readonly maxRatingScore = computed(() => this.ratingFields.length * 5);
  readonly totalRatingPercent = computed(() =>
    Math.round((this.totalRatingScore() / this.maxRatingScore()) * 100)
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
    effect(() => {
      const id = this.panelId();
      if (!this.isAssessmentMode() && id === EMPTY_UUID && !this.isViewMode()) {
        this.scheduleModel.set({
          candidateId:
            this.candidateIdForPanel() && this.candidateIdForPanel() !== EMPTY_UUID
              ? this.candidateIdForPanel()
              : '',
        });
      }
    });

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

  onDeletePanelist(panelId: string) {
    if (!confirm('Are you sure you want to remove this panelist?')) return;

    (this.panelService.deletePanel(panelId) as any).subscribe({
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
    this.scheduleForm().markAsTouched();
    if (!this.scheduleForm().valid()) return;

    if (this.selectedPanelists().length === 0) {
      this.alertService.error('Error', 'Please select at least one panelist.');
      return;
    }

    const formValue = this.scheduleForm().value();

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

    const scheduleData = {
      candidateId: formValue.candidateId,
      panelists: this.selectedPanelists().map((emp) => ({
        employeeId: emp.id,
        ...commonSchedule,
      })),
    };

    (this.panelService.schedulePanel(scheduleData) as any).subscribe({
      next: () => {
        this.alertService.success('Success', 'Panel Scheduled').then(() => {
          this.panelStore.refreshPanels();
          this.save.emit();
        });
      },
      error: () => this.alertService.error('Error', 'Failed to schedule panel'),
    });
  }

  onSubmitAssessment() {
    this.assessmentForm().markAsTouched();
    if (!this.assessmentForm().valid()) return;

    const assessmentData = {
      panelId: this.panelId(),
      ...this.assessmentForm().value(),
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