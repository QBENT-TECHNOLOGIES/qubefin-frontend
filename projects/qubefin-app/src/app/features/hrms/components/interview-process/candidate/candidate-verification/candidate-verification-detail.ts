import { Component, computed, inject, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import { Router } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import {
  CandidateVerificationCheck,
  CandidateVerificationService,
  ICandidateVerification,
} from '../../../../services/candidate-verification.service';

type BooleanVerificationKey =
  | 'isAadharValidated'
  | 'isVoterValited'
  | 'isPanValidated'
  | 'isMobileValidated'
  | 'isUanVerified'
  | 'isCreditBureauChecked';

/** Shows a row's error as soon as the user types (dirty) or tries to verify (touched) - not on a pristine field. */
class TypedOrTouchedMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null): boolean {
    return !!control && control.invalid && (control.dirty || control.touched);
  }
}

export interface IVerificationItemConfig {
  key: BooleanVerificationKey;
  /** Check name the verify endpoint takes for this row. */
  check: CandidateVerificationCheck;
  /** Field on `ICandidateVerification` holding the value entered and saved for this check. */
  valueField: keyof ICandidateVerification;
  label: string;
  placeholder: string;
  maxLength: number;
  /** Format the value must match before it can be verified. Mirrors VerifyCandidateCheckCommandValidator. */
  pattern: RegExp;
  patternMessage: string;
  desc: string;
  icon: string;
  mandatory: boolean;
  group: 'identity' | 'bureau';
}

// Mirrors the six flags on backend `CandidateVerificationDto`. There is no external verification API - HR/Admin
// checks the value themselves, then "Verify" sets the flag and saves the value on the candidate.
export const VERIFICATION_ITEMS: IVerificationItemConfig[] = [
  {
    key: 'isAadharValidated',
    check: 'Aadhar',
    pattern: /^\d{12}$/,
    patternMessage: 'Aadhaar number must be exactly 12 digits',
    valueField: 'aadharNumber',
    placeholder: '12-digit Aadhaar number',
    maxLength: 12,
    label: 'Aadhaar Verification',
    desc: 'Identity verified against Aadhaar',
    icon: 'fingerprint',
    mandatory: true,
    group: 'identity',
  },
  {
    key: 'isPanValidated',
    check: 'Pan',
    pattern: /^[A-Z]{5}\d{4}[A-Z]$/i,
    patternMessage: 'PAN must be in the format ABCDE1234F',
    valueField: 'pan',
    placeholder: 'e.g. ABCDE1234F',
    maxLength: 10,
    label: 'PAN Verification',
    desc: 'Identity verified against PAN',
    icon: 'credit-card',
    mandatory: true,
    group: 'identity',
  },
  {
    key: 'isVoterValited',
    check: 'Voter',
    pattern: /^[A-Z]{3}[0-9]{7}$/,
    patternMessage: 'Voter ID must be 3 capital letters followed by 7 digits (e.g. ABC1234567)',
    valueField: 'voterNumber',
    placeholder: 'Voter ID number',
    maxLength: 10,
    label: 'Voter ID Verification',
    desc: 'Identity verified against Voter ID',
    icon: 'vote',
    mandatory: true,
    group: 'identity',
  },
  {
    key: 'isMobileValidated',
    check: 'Mobile',
    pattern: /^[6-9]\d{9}$/,
    patternMessage: 'Enter a valid 10-digit mobile number',
    valueField: 'mobileNo',
    placeholder: '10-digit mobile number',
    maxLength: 10,
    label: 'Mobile Number',
    desc: 'Mobile number confirmed',
    icon: 'smartphone',
    mandatory: true,
    group: 'identity',
  },
  {
    key: 'isUanVerified',
    check: 'Uan',
    pattern: /^\d{12}$/,
    patternMessage: 'UAN must be exactly 12 digits',
    valueField: 'uan',
    placeholder: '12-digit UAN',
    maxLength: 12,
    label: 'UAN Verification',
    desc: 'Verified with EPFO (Optional)',
    icon: 'building-2',
    mandatory: false,
    group: 'identity',
  },
  {
    key: 'isCreditBureauChecked',
    check: 'CreditBureau',
    pattern: /^https?:\/\/\S+$/i,
    patternMessage: 'Enter a valid link starting with http:// or https://',
    valueField: 'creditBureauReportLink',
    placeholder: 'https://...',
    maxLength: 500,
    label: 'Credit Bureau Report',
    desc: 'Credit bureau report reviewed',
    icon: 'file-bar-chart',
    mandatory: true,
    group: 'bureau',
  },
];

@Component({
  selector: 'qfin-candidate-verification-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    LucideDynamicIcon,
    MatDialogModule,
  ],
  templateUrl: './candidate-verification-detail.html',
})
export class CandidateVerificationDetail implements OnInit {
  // --- Mat Dialog wiring, same pattern as HrAssessmentForm ---
  dialogRef = inject(MatDialogRef<CandidateVerificationDetail>);
  data = inject(MAT_DIALOG_DATA);

  private alertService = inject(AlertService);
  private router = inject(Router);
  private verificationService = inject(CandidateVerificationService);

  @Input() candidateId: string = this.data?.candidateId ?? '';
  @Input() candidateName: string = this.data?.candidateName ?? '';

  readonly identityItems = VERIFICATION_ITEMS.filter((i) => i.group === 'identity');
  readonly bureauItems = VERIFICATION_ITEMS.filter((i) => i.group === 'bureau');
  private readonly mandatoryItems = VERIFICATION_ITEMS.filter((i) => i.mandatory);

  isLoading = signal(false);
  /** Key of the row whose Verify call is in flight. */
  verifyingKey = signal<BooleanVerificationKey | null>(null);
  /** One control per row, seeded from the saved values. Required + the row's format (pattern) - mirrors
   * VerifyCandidateCheckCommandValidator, so a value that fails here would be refused by the API too. */
  readonly controls = Object.fromEntries(
    VERIFICATION_ITEMS.map((item) => [
      item.key,
      new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(item.pattern)] }),
    ]),
  ) as Record<BooleanVerificationKey, FormControl<string>>;

  readonly errorMatcher = new TypedOrTouchedMatcher();

  verificationData = signal<ICandidateVerification>({
    candidateId: '',
    isAadharValidated: false,
    isVoterValited: false,
    isPanValidated: false,
    isMobileValidated: false,
    isUanVerified: false,
    isCreditBureauChecked: false,
    overallStatus: 'Pending',
  });

  // Backend computes `overallStatus` the same way (Aadhar && Voter && Pan && Mobile && CreditBureau);
  // trust that value rather than recomputing it here so the two never drift apart.
  isVerificationComplete = computed(() => this.verificationData().overallStatus === 'Verified');

  /** How many mandatory checks are ticked, drives the progress bar */
  readonly mandatoryCompletedCount = computed(() => {
    const data = this.verificationData();
    return this.mandatoryItems.filter((i) => !!data[i.key]).length;
  });
  readonly mandatoryTotalCount = this.mandatoryItems.length;
  readonly mandatoryPercent = computed(() =>
    Math.round((this.mandatoryCompletedCount() / this.mandatoryTotalCount) * 100),
  );

  ngOnInit() {
    if (!this.candidateId && this.data?.candidateId) {
      this.candidateId = this.data.candidateId;
    }
    if (!this.candidateName && this.data?.candidateName) {
      this.candidateName = this.data.candidateName;
    }
    this.loadVerificationData();
  }

  loadVerificationData() {
    if (!this.candidateId || this.candidateId === EMPTY_UUID) return;

    this.isLoading.set(true);
    this.verificationService.getVerificationStatus(this.candidateId).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res) {
          this.verificationData.set(res);
          this.seedInputs(res);
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.verificationData.update((v) => ({ ...v, candidateId: this.candidateId }));
      },
    });
  }

  private seedInputs(data: ICandidateVerification) {
    for (const item of VERIFICATION_ITEMS) {
      const value = data[item.valueField];
      const control = this.controls[item.key];
      control.setValue(typeof value === 'string' ? value : '');
      control.markAsPristine();
      control.markAsUntouched();
      // A verified value is locked - and a disabled control never shows an error.
      if (data[item.key]) control.disable();
      else control.enable();
    }
  }

  controlFor(item: IVerificationItemConfig): FormControl<string> {
    return this.controls[item.key];
  }

  /** The row's mat-error text: required first, then its format message. */
  getError(item: IVerificationItemConfig): string {
    const errors = this.controls[item.key].errors;
    if (errors?.['required']) return `Enter the ${item.label.replace(' Verification', '')} value`;
    if (errors?.['pattern']) return item.patternMessage;
    return '';
  }

  /** Trims as the user leaves the field so stray spaces don't fail the format. */
  onBlur(item: IVerificationItemConfig) {
    const control = this.controls[item.key];
    const trimmed = control.value.trim();
    if (trimmed !== control.value) control.setValue(trimmed);
  }

  /** Sets this check's flag on the candidate and saves the entered value. */
  verifyItem(item: IVerificationItemConfig) {
    const control = this.controls[item.key];
    control.setValue(control.value.trim());
    control.markAsTouched();
    if (control.invalid) {
      return;
    }
    const value = control.value;

    this.verifyingKey.set(item.key);
    this.verificationService.verifyCheck(this.candidateId, item.check, value).subscribe({
      next: (res) => {
        this.verifyingKey.set(null);
        this.verificationData.set(res);
        this.seedInputs(res);
        this.alertService.success('Verified', `${item.label} marked as verified.`);
      },
      error: () => {
        this.verifyingKey.set(null);
        this.alertService.error('Error', `Could not verify ${item.label}. Please try again.`);
      },
    });
  }

  isChecked(key: BooleanVerificationKey): boolean {
    return !!this.verificationData()[key];
  }

  getStatusClass(isVerified: boolean) {
    return isVerified
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800'
      : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
  }

  getStatusIcon(isVerified: boolean): string {
    return isVerified ? 'check-circle-2' : 'clock';
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
