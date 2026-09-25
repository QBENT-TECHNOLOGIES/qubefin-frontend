import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService } from 'qubefin-core';

import { RATING_FIELDS, RATING_OPTIONS } from '../interview-panel-detail/interview-panel-detail';
import { HrAssessmentService } from '../../../../services/hr-assessment.service';
import {
  IHrAssessmentDecisionDto,
  IHrAssessmentFormDto,
  IPanelistRatingSummaryDto,
} from '../../../../models/hr-assessment';
import { PayrollService } from '../../../../../payroll/services/payroll-service';
import { CandidateService } from '../../../../services/candidate-service';

interface ISalaryGrade {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

export const RECOMMENDATION_OPTIONS = [
  { value: 'Strongly Recommended', tone: 'emerald' },
  { value: 'Recommended', tone: 'emerald' },
  { value: 'Recommended with Training', tone: 'amber' },
  { value: 'Hold for Future Opportunity', tone: 'slate' },
  { value: 'Not Recommended', tone: 'rose' },
];

@Component({
  selector: 'app-hr-assessment-form',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogModule,
    ReactiveFormsModule,
    LucideDynamicIcon,
  ],
  providers: [provideNativeDateAdapter(), DatePipe],
  templateUrl: './hr-assessment-form.html',
})
export class HrAssessmentForm implements OnInit {
  readonly dateAdapter = inject(DateAdapter<Date>);
  dialogRef = inject(MatDialogRef<HrAssessmentForm>);
  data = inject(MAT_DIALOG_DATA);
  private hrAssessmentService = inject(HrAssessmentService);
  private payrollService = inject(PayrollService);
  private candidateService = inject(CandidateService);
  private alertService = inject(AlertService);
  private datePipe = inject(DatePipe);

  candidateId: string = this.data?.candidateId ?? '';
  candidateName: string = this.data?.candidateName ?? '';

  // Candidate snapshot shown at the top of the form - passed straight from the Candidate View page
  // (already loaded there), so this form doesn't need its own query for it.
  interviewPostName: string = this.data?.interviewPostName ?? '';
  departmentName: string = this.data?.departmentName ?? '';
  interviewDate: string = this.data?.interviewDate ?? '';

  interviewMode = signal<'Online' | 'Offline' | null>(this.data?.interviewMode ?? null);
  isSavingInterviewMode = signal(false);

  // Same 10 categories / 0-5 scale as the interviewer assessment form - HR sees the average of these,
  // never types them in directly.
  ratingFields = RATING_FIELDS;
  ratingOptions = RATING_OPTIONS;
  recommendationOptions = RECOMMENDATION_OPTIONS;
  maxScore = this.ratingFields.length * 5;

  isLoading = signal(false);
  isSaving = signal(false);
  isSubmitting = signal(false);
  salaryGrades = signal<ISalaryGrade[]>([]);

  assessment = signal<IHrAssessmentFormDto | null>(null);
  isLocked = computed(() => !!this.assessment()?.isSubmitted);

  /** HR has already submitted their own interviewer assessment (genuinely on the panel, not just holding
   * the administrative HR row). */
  hrIsInterviewer = computed(() => !!this.assessment()?.hrIsInterviewer);

  /** HR is the ONLY interviewer on the panel - the fields shared with the interviewer assessment form
   * (ratings, isRecommendedForPosition, positiveRemarks, negativeRemarks, anyOtherJobsSuitedRemarks) render
   * disabled here, sourced from HR's own single submission. When HR is one of several interviewers those
   * same fields stay enabled/live instead. */
  isHrOnlyInterviewer = computed(() => !!this.assessment()?.isHrOnlyInterviewer);

  /** The four fields this form shares with the interviewer assessment form. */
  private readonly sharedFieldNames = [
    'anyOtherJobsSuitedRemarks',
    'positiveRemarks',
    'negativeRemarks',
  ] as const;

  /** Whether the shared fields (including the isRecommendedForPosition Yes/No buttons, which aren't plain
   * inputs) should render disabled - either the whole form is locked, or HR is the sole interviewer. */
  isSharedFieldsDisabled = computed(() => this.isLocked() || this.isHrOnlyInterviewer());

  readonly totalAverage = computed(() => this.assessment()?.averageTotalRatingPoint ?? null);
  readonly totalAveragePercent = computed(() => {
    const total = this.totalAverage();
    return total == null ? 0 : Math.round((total / this.maxScore) * 100);
  });
  readonly panelists = computed<IPanelistRatingSummaryDto[]>(
    () => this.assessment()?.panelists ?? [],
  );

  readonly decisionForm = new FormGroup({
    // Salary & joining - facts about the candidate, confirmed here by HR.
    currentSalary: new FormControl<number | null>(null),
    expectedSalary: new FormControl<number | null>(null),
    noticePeriodInDays: new FormControl<number | null>(null),
    earliestJoiningDate: new FormControl<Date | null>(null),
    isWillingRelocate: new FormControl(false, { nonNullable: true }),
    preferredLocation: new FormControl('', { nonNullable: true }),

    overallPerformance: new FormControl('', { nonNullable: true }),
    suitableRoleDepartment: new FormControl('', { nonNullable: true }),
    recommendedGradeId: new FormControl<string | null>(null),
    isTrainingRequired: new FormControl(false, { nonNullable: true }),
    recommendationStatus: new FormControl<string | null>(null, {
      validators: [Validators.required],
    }),
    anyOtherJobsSuitedRemarks: new FormControl('', { nonNullable: true }),
    isRecommendedForPosition: new FormControl<boolean | null>(null),
    positiveRemarks: new FormControl('', { nonNullable: true }),
    negativeRemarks: new FormControl('', { nonNullable: true }),
  });

  ngOnInit() {
    this.payrollService.getSalaryGrade().subscribe({
      next: (grades) => this.salaryGrades.set((grades as ISalaryGrade[]) ?? []),
      error: () => this.salaryGrades.set([]),
    });

    this.loadAssessment();
  }

  constructor() {
    this.dateAdapter.setLocale('en-GB');
  }
  private loadAssessment() {
    if (!this.candidateId) return;

    this.isLoading.set(true);
    this.hrAssessmentService.getAssessmentForm(this.candidateId).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.assessment.set(res);
        this.decisionForm.reset({
          currentSalary: res.currentSalary ?? null,
          expectedSalary: res.expectedSalary ?? null,
          noticePeriodInDays: res.noticePeriodInDays ?? null,
          earliestJoiningDate: res.earliestJoiningDate ? new Date(res.earliestJoiningDate) : null,
          isWillingRelocate: res.isWillingRelocate ?? false,
          preferredLocation: res.preferredLocation ?? '',

          overallPerformance: res.overallPerformance ?? '',
          suitableRoleDepartment: res.suitableRoleDepartment ?? '',
          recommendedGradeId: res.recommendedGradeId ?? null,
          isTrainingRequired: res.isTrainingRequired,
          recommendationStatus: res.recommendationStatus ?? null,
          anyOtherJobsSuitedRemarks: res.anyOtherJobsSuitedRemarks ?? '',
          isRecommendedForPosition: res.isRecommendedForPosition ?? null,
          positiveRemarks: res.positiveRemarks ?? '',
          negativeRemarks: res.negativeRemarks ?? '',
        });

        if (res.isSubmitted) {
          this.decisionForm.disable();
        } else if (res.isHrOnlyInterviewer) {
          // HR is the sole interviewer - these fields are HR's own already-submitted interviewer answers,
          // shown for reference only. The rest of the form (OverallPerformance onward) stays editable.
          this.sharedFieldNames.forEach((name) => this.decisionForm.get(name)?.disable());
        } else {
          // Re-enable in case the panel composition changed since this form was last loaded (e.g. another
          // interviewer was added after HR had been the sole one).
          this.sharedFieldNames.forEach((name) => this.decisionForm.get(name)?.enable());
        }
      },
      error: (error: any) => {
        this.isLoading.set(false);
        this.alertService.error('Error', error?.error?.message ?? 'Unable to load HR Assessment.');
      },
    });
  }

  /** Read-only average for a rating field, e.g. 'appearanceAttitude' -> averageAppearanceAttitudeRating */
  getAverageRating(key: string): number | null {
    const dto = this.assessment();
    if (!dto) return null;
    const propName =
      `average${key.charAt(0).toUpperCase()}${key.slice(1)}Rating` as keyof IHrAssessmentFormDto;
    const value = dto[propName];
    return typeof value === 'number' ? value : null;
  }

  getRatingLabel(value: number | null): string {
    if (value == null) return 'Not yet rated';
    return this.ratingOptions.find((o) => o.value === value)?.full ?? '-';
  }

  /** One panelist's rating for a field, e.g. 'appearanceAttitude' -> appearanceAttitudeRating */
  getPanelistRating(panelist: IPanelistRatingSummaryDto, key: string): number | null {
    const propName = `${key}Rating` as keyof IPanelistRatingSummaryDto;
    const value = panelist[propName];
    return typeof value === 'number' ? value : null;
  }

  /** Interview mode belongs to the candidate record, not the HR decision - persisted immediately on
   * click rather than only when the assessment draft/submit is saved. */
  setInterviewMode(value: 'Online' | 'Offline') {
    if (this.isLocked() || this.isSavingInterviewMode() || this.interviewMode() === value) return;

    const previous = this.interviewMode();
    this.interviewMode.set(value);
    this.isSavingInterviewMode.set(true);

    this.candidateService.updateInterviewMode(this.candidateId, value).subscribe({
      next: () => this.isSavingInterviewMode.set(false),
      error: (error: any) => {
        this.isSavingInterviewMode.set(false);
        this.interviewMode.set(previous);
        this.alertService.error(
          'Error',
          error?.error?.message ?? 'Unable to update interview mode.',
        );
      },
    });
  }

  setWillingRelocate(value: boolean) {
    if (this.isLocked()) return;
    this.decisionForm.get('isWillingRelocate')?.setValue(value);
  }

  setRecommendationStatus(value: string) {
    this.decisionForm.get('recommendationStatus')?.setValue(value);
  }

  setRecommendedForPosition(value: boolean) {
    this.decisionForm.get('isRecommendedForPosition')?.setValue(value);
  }

  saveDraft() {
    if (!this.candidateId || this.isLocked()) return;

    if (!this.interviewMode()) {
      this.alertService.error(
        'Incomplete',
        'Please select the interview mode (Online/Offline) before saving.',
      );
      return;
    }

    this.isSaving.set(true);
    this.hrAssessmentService.saveDraft(this.candidateId, this.buildDecision()).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.alertService.success('Success', 'HR Assessment saved as draft.');
        this.loadAssessment();
      },
      error: (error: any) => {
        this.isSaving.set(false);
        this.alertService.error('Error', error?.error?.message ?? 'Unable to save draft.');
      },
    });
  }

  submit() {
    if (!this.candidateId || this.isLocked()) return;

    if (!this.interviewMode()) {
      this.alertService.error(
        'Incomplete',
        'Please select the interview mode (Online/Offline) before submitting.',
      );
      return;
    }

    if (this.decisionForm.invalid) {
      this.decisionForm.markAllAsTouched();
      this.alertService.error('Incomplete', 'Please select a recommendation before submitting.');
      return;
    }

    this.isSubmitting.set(true);
    this.hrAssessmentService.submit(this.candidateId, this.buildDecision()).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.dialogRef.close(true);
      },
      error: (error: any) => {
        this.isSubmitting.set(false);
        this.alertService.error(
          'Error',
          error?.error?.message ?? 'Unable to submit HR Assessment.',
        );
      },
    });
  }

  private buildDecision(): IHrAssessmentDecisionDto {
    const v = this.decisionForm.getRawValue();
    return {
      currentSalary: v.currentSalary ?? undefined,
      expectedSalary: v.expectedSalary ?? undefined,
      noticePeriodInDays: v.noticePeriodInDays ?? undefined,
      // The API takes a DateOnly - send the calendar date, never an ISO instant that can shift a day.
      earliestJoiningDate:
        this.datePipe.transform(v.earliestJoiningDate, 'yyyy-MM-dd') ?? undefined,
      isWillingRelocate: v.isWillingRelocate,
      preferredLocation: v.preferredLocation || undefined,

      overallPerformance: v.overallPerformance || undefined,
      suitableRoleDepartment: v.suitableRoleDepartment || undefined,
      recommendedGradeId: v.recommendedGradeId || undefined,
      isTrainingRequired: v.isTrainingRequired,
      recommendationStatus: v.recommendationStatus || undefined,
      anyOtherJobsSuitedRemarks: v.anyOtherJobsSuitedRemarks || undefined,
      isRecommendedForPosition: v.isRecommendedForPosition ?? undefined,
      positiveRemarks: v.positiveRemarks || undefined,
      negativeRemarks: v.negativeRemarks || undefined,
    };
  }

  getInitials(name: string | undefined | null): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('');
  }

  onCancel() {
    this.dialogRef.close();
  }
}
