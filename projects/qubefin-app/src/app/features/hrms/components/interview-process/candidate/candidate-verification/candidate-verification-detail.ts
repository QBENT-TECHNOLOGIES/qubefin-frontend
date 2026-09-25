import { Component, computed, inject, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
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
    pattern: /^[A-Z]{3}\d{7}$/i,
    patternMessage: 'Voter ID must be 3 letters followed by 7 digits',
    valueField: 'voterNumber',
    placeholder: 'Voter ID number',
    maxLength: 20,
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
  /** What HR has typed in each row's input, seeded from the saved values. */
  inputValues = signal<Partial<Record<BooleanVerificationKey, string>>>({});

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
    const values: Partial<Record<BooleanVerificationKey, string>> = {};
    for (const item of VERIFICATION_ITEMS) {
      const value = data[item.valueField];
      values[item.key] = typeof value === 'string' ? value : '';
    }
    this.inputValues.set(values);
  }

  /** Rows whose format error is shown - after the first edit or a Verify attempt. */
  readonly touchedKeys = signal<Set<BooleanVerificationKey>>(new Set());

  /** Format error for the row's current value, or '' when it is empty or valid. */
  getPatternError(item: IVerificationItemConfig): string {
    if (this.isChecked(item.key) || !this.touchedKeys().has(item.key)) return '';
    const value = this.getInputValue(item).trim();
    return value && !item.pattern.test(value) ? item.patternMessage : '';
  }

  getInputValue(item: IVerificationItemConfig): string {
    return this.inputValues()[item.key] ?? '';
  }

  onInputChange(item: IVerificationItemConfig, value: string) {
    this.inputValues.update((v) => ({ ...v, [item.key]: value }));
    this.touchedKeys.update((keys) => new Set(keys).add(item.key));
  }

  /** Sets this check's flag on the candidate and saves the entered value. */
  verifyItem(item: IVerificationItemConfig) {
    const value = this.getInputValue(item).trim();
    if (!value) {
      this.alertService.error('Required', `Enter the ${item.label.replace(' Verification', '')} value before verifying.`);
      return;
    }
    if (!item.pattern.test(value)) {
      this.touchedKeys.update((keys) => new Set(keys).add(item.key));
      return;
    }

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
