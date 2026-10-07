import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { LucideDynamicIcon } from '@lucide/angular';
import { disabled, form, FormField, schema, Schema } from '@angular/forms/signals';
import { AlertService } from 'qubefin-core';
import { InterviewPanelService } from '../../../../services/interview-panel-service';
import { IInterviewAssessmentDto } from '../../../../models/interview-panel';
import { SessionService } from '../../../../../../services/session.service';
import { RATING_FIELDS, RATING_OPTIONS, RatingLegend } from '../../assessment-rating';

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

export interface IInterviewAssessmentDialogData {
  candidateId: string;
  candidateName: string;
  referenceNo: string | null;
  /** View Assessment: the completed assessment, read-only. */
  readOnly: boolean;
}

/** The interviewer's own assessment of a candidate (Interview page). Opened after the candidate is recorded
 * present, or read-only from "View Assessment" once submitted. Closes with `true` once submitted. */
@Component({
  selector: 'qfin-interview-assessment-dialog',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    LucideDynamicIcon,
    FormField,
    RatingLegend,
  ],
  templateUrl: './interview-assessment-dialog.html',
})
export class InterviewAssessmentDialog implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<InterviewAssessmentDialog>);
  private readonly panelService = inject(InterviewPanelService);
  private readonly alertService = inject(AlertService);
  private readonly sessionService = inject(SessionService);
  protected readonly data = inject<IInterviewAssessmentDialogData>(MAT_DIALOG_DATA);

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
    disabled(path.anyOtherJobsSuitedRemarks, { when: () => this.isReadOnly() });
    disabled(path.positiveRemarks, { when: () => this.isReadOnly() });
    disabled(path.negativeRemarks, { when: () => this.isReadOnly() });
  });

  protected readonly assessmentForm = form(this.assessmentModel, this.assessmentSchema);

  readonly ratingFields = RATING_FIELDS;
  readonly ratingOptions = RATING_OPTIONS;

  readonly existingAssessment = signal<IInterviewAssessmentDto | null>(null);
  readonly loadingAssessment = signal<boolean>(false);
  readonly savingDraft = signal<boolean>(false);
  readonly submitting = signal<boolean>(false);

  /** Read-only when opened from View Assessment, or once submitted - matches the backend rule. */
  readonly isReadOnly = computed(() => this.data.readOnly || !!this.existingAssessment()?.isSubmitted);

  /** Live running total out of 50, drives the header progress indicator. */
  readonly totalRatingScore = computed(() => {
    const m: any = this.assessmentModel();
    return this.ratingFields.reduce((sum, f) => sum + (Number(m[`${f.key}Rating`]) || 0), 0);
  });
  readonly maxRatingScore = computed(() => this.ratingFields.length * 5);
  readonly totalRatingPercent = computed(() =>
    Math.round((this.totalRatingScore() / this.maxRatingScore()) * 100),
  );

  ngOnInit() {
    this.fetchExistingAssessment();
  }

  getRating(key: string): number {
    return (this.assessmentModel() as any)[`${key}Rating`] ?? 0;
  }

  getRemarks(key: string): string {
    return (this.assessmentModel() as any)[`${key}Remarks`] ?? '';
  }

  setRating(key: string, value: number) {
    if (this.isReadOnly()) return;
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

  /** Loads the interviewer's own assessment (draft or submitted) so re-opening the form doesn't lose progress. */
  private fetchExistingAssessment() {
    const employeeId = this.sessionService.employeeId;
    if (!employeeId) return;

    this.loadingAssessment.set(true);
    this.panelService.getAssessmentByCandidateAndEmployee(this.data.candidateId, employeeId).subscribe({
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
      error: () => this.loadingAssessment.set(false),
    });
  }

  private request() {
    return {
      candidateId: this.data.candidateId,
      assessment: this.assessmentForm().value(),
    };
  }

  onSubmitAssessment() {
    if (this.isReadOnly() || this.submitting()) return;

    this.assessmentForm().markAsTouched();
    if (!this.assessmentForm().valid()) return;

    this.submitting.set(true);
    (this.panelService.submitAssessment(this.request() as any) as any).subscribe({
      next: () => {
        this.submitting.set(false);
        this.alertService.success('Success', 'Assessment Submitted').then(() => this.dialogRef.close(true));
      },
      error: (error: any) => {
        this.submitting.set(false);
        this.alertService.error('Error', error?.error?.message ?? 'Failed to submit assessment');
      },
    });
  }

  /** Saves the in-progress assessment without locking it; the dialog stays open. */
  onSaveAssessmentDraft() {
    if (this.isReadOnly() || this.savingDraft()) return;

    this.savingDraft.set(true);
    (this.panelService.saveAssessmentDraft(this.request() as any) as any).subscribe({
      next: () => {
        this.savingDraft.set(false);
        this.alertService.success('Success', 'Assessment saved as draft');
        this.fetchExistingAssessment();
      },
      error: (error: any) => {
        this.savingDraft.set(false);
        this.alertService.error('Error', error?.error?.message ?? 'Failed to save draft');
      },
    });
  }

  onCancel() {
    this.dialogRef.close(false);
  }
}
