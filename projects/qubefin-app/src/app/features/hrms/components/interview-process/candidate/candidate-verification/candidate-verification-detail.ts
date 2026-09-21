import { Component, computed, inject, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import { Router } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import {
  CandidateVerificationService,
  ICandidateVerification,
  ICandidateVerificationUpdateRequest,
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
  /** Field on `ICandidateVerification` holding the document number/value to display next to this check, if any. */
  numberField?: keyof ICandidateVerification;
  label: string;
  desc: string;
  icon: string;
  mandatory: boolean;
  group: 'identity' | 'bureau';
}

// Mirrors the six flags on backend `CandidateVerificationDto` / `UpdateCandidateVerificationCommand`.
// There is no external verification API - HR/Admin ticks each box after checking it themselves, so
// these are plain checkboxes, not an async "Verify" action with a Pending/In Progress/Failed lifecycle.
export const VERIFICATION_ITEMS: IVerificationItemConfig[] = [
  {
    key: 'isAadharValidated',
    numberField: 'aadharNumber',
    label: 'Aadhaar Verification',
    desc: 'Identity verified against Aadhaar',
    icon: 'fingerprint',
    mandatory: true,
    group: 'identity',
  },
  {
    key: 'isPanValidated',
    numberField: 'pan',
    label: 'PAN Verification',
    desc: 'Identity verified against PAN',
    icon: 'credit-card',
    mandatory: true,
    group: 'identity',
  },
  {
    key: 'isVoterValited',
    numberField: 'voterNumber',
    label: 'Voter ID Verification',
    desc: 'Identity verified against Voter ID',
    icon: 'vote',
    mandatory: true,
    group: 'identity',
  },
  {
    key: 'isMobileValidated',
    numberField: 'mobileNo',
    label: 'Mobile Number',
    desc: 'Mobile number confirmed',
    icon: 'smartphone',
    mandatory: true,
    group: 'identity',
  },
  {
    key: 'isUanVerified',
    numberField: 'uan',
    label: 'UAN Verification',
    desc: 'Verified with EPFO (Optional)',
    icon: 'building-2',
    mandatory: false,
    group: 'identity',
  },
  {
    key: 'isCreditBureauChecked',
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
    ReactiveFormsModule,
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

  readonly creditBureauReportLink = new FormControl('', {
    validators: [Validators.maxLength(500)],
    nonNullable: true,
  });

  isLoading = signal(false);
  isSaving = signal(false);

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
          this.creditBureauReportLink.setValue(res.creditBureauReportLink ?? '');
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.verificationData.update((v) => ({ ...v, candidateId: this.candidateId }));
      },
    });
  }

  /** HR/Admin ticks or unticks a check after personally verifying it. Not persisted until Save. */
  toggleItem(key: BooleanVerificationKey) {
    this.verificationData.update((v) => ({ ...v, [key]: !v[key] }));
  }

  saveVerification() {
    const data = this.verificationData();
    const request: ICandidateVerificationUpdateRequest = {
      isAadharValidated: data.isAadharValidated,
      isVoterValited: data.isVoterValited,
      isPanValidated: data.isPanValidated,
      isMobileValidated: data.isMobileValidated,
      isUanVerified: data.isUanVerified,
      isCreditBureauChecked: data.isCreditBureauChecked,
      creditBureauReportLink: this.creditBureauReportLink.value || undefined,
    };

    this.isSaving.set(true);
    this.verificationService.updateVerification(this.candidateId, request).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.verificationData.set(res);
        this.alertService.success('Success', 'Verification status saved.');
      },
      error: () => {
        this.isSaving.set(false);
        this.alertService.error('Error', 'Could not save verification status. Please try again.');
      },
    });
  }

  proceedToOffer() {
    if (this.isVerificationComplete()) {
      this.dialogRef.close(true);
      this.router.navigate(['/offer-letter', this.candidateId]);
    } else {
      this.alertService.error(
        'Verification Incomplete',
        'Please complete all mandatory verifications and save before proceeding to offer.',
      );
    }
  }

  isChecked(key: BooleanVerificationKey): boolean {
    return !!this.verificationData()[key];
  }

  getNumberValue(item: IVerificationItemConfig): string {
    if (!item.numberField) return '';
    const value = this.verificationData()[item.numberField];
    return typeof value === 'string' ? value : '';
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
