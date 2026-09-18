import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { FormControl, FormGroup, ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

export interface IHrAssessmentRatingField {
  key: string;
  label: string;
  desc?: string;
}

export const HR_RATING_FIELDS: IHrAssessmentRatingField[] = [
  { key: 'appearance', label: 'Appearance & Professional Grooming' },
  { key: 'confidence', label: 'Confidence & Personality' },
  { key: 'communication', label: 'Communication Skills' },
  { key: 'education', label: 'Educational Qualification' },
  { key: 'experience', label: 'Relevant Work Experience' },
  { key: 'technical', label: 'Technical / Functional Knowledge' },
  { key: 'problemSolving', label: 'Problem Solving Ability' },
  { key: 'leadership', label: 'Leadership & Team Handling Skills' },
  { key: 'decisionMaking', label: 'Decision Making Ability' },
  { key: 'adaptability', label: 'Adaptability & Flexibility' },
  { key: 'behaviour', label: 'Behaviour & Attitude' },
  { key: 'knowledgeOrg', label: 'Knowledge about the Organization' },
  { key: 'careerGoals', label: 'Career Goals & Ambition' },
  { key: 'stability', label: 'Stability & Commitment' },
  { key: 'overallSuitability', label: 'Overall Suitability for the Role' },
];

/** Same 0-5 label scale used across the interview-panel forms, for a consistent rating UI */
export const HR_RATING_OPTIONS = [
  { value: 0, label: 'NA', full: 'Not Acceptable' },
  { value: 1, label: 'BA', full: 'Below Average' },
  { value: 2, label: 'A', full: 'Average' },
  { value: 3, label: 'G', full: 'Good' },
  { value: 4, label: 'VG', full: 'Very Good' },
  { value: 5, label: 'O', full: 'Outstanding' },
];

@Component({
  selector: 'app-hr-assessment-form',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatDialogModule,
    ReactiveFormsModule,
    LucideAngularModule
  ],
  providers: [DatePipe],
  templateUrl: './hr-assessment-form.html',
})
export class HrAssessmentForm implements OnInit {
  dialogRef = inject(MatDialogRef<HrAssessmentForm>);
  data = inject(MAT_DIALOG_DATA);
  fb = inject(FormBuilder);

  candidateId = this.data?.candidateId;
  candidateName = this.data?.candidateName;

  ratingFields = HR_RATING_FIELDS;
  ratingOptions = HR_RATING_OPTIONS;

  assessmentForm: FormGroup = this.fb.group({});

  salaryForm = this.fb.group({
    currentSalary: [''],
    expectedSalary: [''],
    noticePeriod: [''],
    earliestJoiningDate: [''],
    willingToRelocate: [false],
    preferredLocation: ['']
  });

  evaluationForm = this.fb.group({
    overallPerformanceRemarks: [''],
    suitableRoleDepartment: [''],
    recommendedGrade: [''],
    trainingRequired: [''],
    recommendationStatus: ['']
  });

  recommendationOptions = [
    { value: 'Strongly Recommended', tone: 'emerald' },
    { value: 'Recommended', tone: 'emerald' },
    { value: 'Recommended with Training', tone: 'amber' },
    { value: 'Hold for Future Opportunity', tone: 'slate' },
    { value: 'Not Recommended', tone: 'rose' },
  ];

  totalRatingScore = 0;
  maxScore = this.ratingFields.length * 5;

  ngOnInit() {
    this.ratingFields.forEach(field => {
      this.assessmentForm.addControl(`${field.key}Rating`, new FormControl(0));
      this.assessmentForm.addControl(`${field.key}Remarks`, new FormControl(''));
    });

    this.assessmentForm.valueChanges.subscribe(val => {
      this.totalRatingScore = this.ratingFields.reduce((sum, f) => {
        return sum + (Number(val[`${f.key}Rating`]) || 0);
      }, 0);
    });
  }

  getInitials(name: string | undefined | null): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('');
  }

  get totalRatingPercent(): number {
    return Math.round((this.totalRatingScore / this.maxScore) * 100);
  }

  /** Current rating value for a field, used to highlight the selected segmented button */
  getRating(key: string): number {
    return this.assessmentForm.get(`${key}Rating`)?.value ?? 0;
  }

  /** Click a rating button: set it, or clear back to 0 if it's already selected */
  setRating(key: string, value: number) {
    const control = this.assessmentForm.get(`${key}Rating`);
    if (!control) return;
    control.setValue(control.value === value ? 0 : value);
  }

  onCancel() {
    this.dialogRef.close();
  }

  onSubmit() {
    const payload = {
      candidateId: this.candidateId,
      ratings: this.assessmentForm.value,
      salary: this.salaryForm.value,
      evaluation: this.evaluationForm.value
    };

    console.log('HR Assessment Payload', payload);
    this.dialogRef.close(payload);
  }
}