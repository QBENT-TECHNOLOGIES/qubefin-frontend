import { Component, computed, inject, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import { Router } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { IVerificationModel } from '../../../../services/candidate-verification.service';

export interface IVerificationItemConfig {
  key: keyof IVerificationModel;
  label: string;
  desc: string;
  icon: string;
  mandatory: boolean;
  actionLabel: string;
  group: 'identity' | 'bureau';
}

export const VERIFICATION_ITEMS: IVerificationItemConfig[] = [
  {
    key: 'aadhaarStatus',
    label: 'Aadhaar Verification',
    desc: 'Verify identity with UIDAI',
    icon: 'fingerprint',
    mandatory: true,
    actionLabel: 'Verify',
    group: 'identity',
  },
  {
    key: 'panStatus',
    label: 'PAN Verification',
    desc: 'Verify with NSDL',
    icon: 'credit-card',
    mandatory: true,
    actionLabel: 'Verify',
    group: 'identity',
  },
  {
    key: 'voterIdStatus',
    label: 'Voter ID Verification',
    desc: 'Verify with ECI portal',
    icon: 'vote',
    mandatory: false,
    actionLabel: 'Verify',
    group: 'identity',
  },
  {
    key: 'mobileStatus',
    label: 'Mobile Number',
    desc: 'OTP Verification',
    icon: 'smartphone',
    mandatory: true,
    actionLabel: 'Send OTP',
    group: 'identity',
  },
  {
    key: 'uanStatus',
    label: 'UAN Verification',
    desc: 'Verify with EPFO (Optional)',
    icon: 'building-2',
    mandatory: false,
    actionLabel: 'Verify',
    group: 'identity',
  },
  {
    key: 'hrBureauStatus',
    label: 'HR Bureau Report',
    desc: 'Equifax HR Bureau',
    icon: 'shield-check',
    mandatory: true,
    actionLabel: 'Fetch Report',
    group: 'bureau',
  },
  {
    key: 'creditBureauStatus',
    label: 'Credit Bureau Report',
    desc: 'Equifax Credit Bureau',
    icon: 'file-bar-chart',
    mandatory: true,
    actionLabel: 'Fetch Report',
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

  @Input() candidateId: string = this.data?.candidateId ?? '';
  @Input() candidateName: string = this.data?.candidateName ?? '';

  readonly documentFieldMap: Partial<Record<keyof IVerificationModel, string>> = {
    aadhaarStatus: 'aadhaar',
    panStatus: 'pan',
    voterIdStatus: 'voterId',
    mobileStatus: 'mobile',
    uanStatus: 'uan',
  };

  readonly documentForm = new FormGroup({
    aadhaar: new FormControl('', {
      validators: [Validators.pattern(/^\d{12}$/)],
      nonNullable: true,
    }),
    pan: new FormControl('', {
      validators: [Validators.pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)],
      nonNullable: true,
    }),
    voterId: new FormControl('', {
      validators: [Validators.pattern(/^[A-Z]{3}[A-Z0-9]{7,10}$/)],
      nonNullable: true,
    }),
    mobile: new FormControl('', {
      validators: [Validators.pattern(/^[6-9]\d{9}$/)],
      nonNullable: true,
    }),
    uan: new FormControl('', { validators: [Validators.pattern(/^\d{12}$/)], nonNullable: true }),
  });

  readonly identityItems = VERIFICATION_ITEMS.filter((i) => i.group === 'identity');
  readonly bureauItems = VERIFICATION_ITEMS.filter((i) => i.group === 'bureau');
  private readonly mandatoryItems = VERIFICATION_ITEMS.filter((i) => i.mandatory);

  verificationData = signal<IVerificationModel>({
    candidateId: '',
    aadhaarStatus: 'Pending',
    panStatus: 'Pending',
    voterIdStatus: 'Pending',
    mobileStatus: 'Pending',
    uanStatus: 'Pending',
    hrBureauStatus: 'Pending',
    creditBureauStatus: 'Pending',
    overallStatus: 'Pending',
  });

  isVerificationComplete = computed(() => {
    const data = this.verificationData();
    return (
      data.aadhaarStatus === 'Verified' &&
      data.panStatus === 'Verified' &&
      data.mobileStatus === 'Verified' &&
      data.hrBureauStatus === 'Verified' &&
      data.creditBureauStatus === 'Verified'
    );
  });

  /** How many mandatory checks are Verified, drives the progress bar */
  readonly mandatoryCompletedCount = computed(() => {
    const data: any = this.verificationData();
    return this.mandatoryItems.filter((i) => data[i.key] === 'Verified').length;
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

    // this.verificationService.getVerificationStatus(this.candidateId).subscribe({
    //   next: (res) => {
    //     if (res) this.verificationData.set(res);
    //   },
    //   error: () => {
    //     // Pending backend, stub gracefully
    //     this.verificationData.set({
    //         ...this.verificationData(),
    //         candidateId: this.candidateId
    //     });
    //   }
    // });
  }

  onVerify(documentType: string) {
    this.verificationData.update((v) => ({ ...v, [documentType]: 'In Progress' }));

    // Simulate API call for now (pending backend)
    // this.verificationService.verifyDocument(this.candidateId, documentType, {}).subscribe({
    //   next: () => {
    //     this.verificationData.update(v => ({...v, [documentType]: 'Verified'}));
    //     this.checkOverallStatus();
    //   },
    //   error: () => {
    //     // Mock successful verification if API is down
    //     setTimeout(() => {
    //         this.verificationData.update(v => ({...v, [documentType]: 'Verified'}));
    //         this.checkOverallStatus();
    //     }, 1000);
    //   }
    // });
  }

  checkOverallStatus() {
    if (this.isVerificationComplete()) {
      this.verificationData.update((v) => ({ ...v, overallStatus: 'Verified' }));
    }
  }

  proceedToOffer() {
    if (this.isVerificationComplete()) {
      this.dialogRef.close(true);
      this.router.navigate(['/offer-letter', this.candidateId]);
    } else {
      this.alertService.error(
        'Verification Incomplete',
        'Please complete all mandatory verifications before proceeding to offer.',
      );
    }
  }

  getStatus(key: keyof IVerificationModel): string {
    return (this.verificationData() as any)[key];
  }

  getStatusClass(status: string) {
    switch (status) {
      case 'Verified':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800';
      case 'Failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'Verified':
        return 'check-circle-2';
      case 'Failed':
        return 'x-circle';
      case 'In Progress':
        return 'loader-circle';
      default:
        return 'clock';
    }
  }

  getDocumentControlName(key: keyof IVerificationModel): string {
    return this.documentFieldMap[key] ?? '';
  }

  getDocumentControl(key: keyof IVerificationModel): FormControl<string> | null {
    const controlName = this.getDocumentControlName(key);
    const control = controlName ? this.documentForm.get(controlName) : null;
    return control instanceof FormControl ? control : null;
  }

  isDocumentInputVisible(key: keyof IVerificationModel): boolean {
    return !!this.getDocumentControlName(key);
  }

  hasDocumentError(key: keyof IVerificationModel): boolean {
    const control = this.getDocumentControl(key);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  isDocumentInvalid(key: keyof IVerificationModel): boolean {
    return !!this.getDocumentControl(key)?.invalid;
  }

  getDocumentLabel(key: keyof IVerificationModel): string {
    const nameMap: Partial<Record<keyof IVerificationModel, string>> = {
      aadhaarStatus: 'Aadhaar Number',
      panStatus: 'PAN Number',
      voterIdStatus: 'Voter ID',
      mobileStatus: 'Mobile Number',
      uanStatus: 'UAN Number',
    };
    return nameMap[key] ?? 'Document Number';
  }

  getDocumentPlaceholder(key: keyof IVerificationModel): string {
    const placeholderMap: Partial<Record<keyof IVerificationModel, string>> = {
      aadhaarStatus: '12-digit Aadhaar number',
      panStatus: 'ABCDE1234F',
      voterIdStatus: 'ABC1234567',
      mobileStatus: '10-digit mobile no.',
      uanStatus: '12-digit UAN',
    };
    return placeholderMap[key] ?? 'Enter number';
  }

  getDocumentErrorMessage(key: keyof IVerificationModel): string {
    const messageMap: Partial<Record<keyof IVerificationModel, string>> = {
      aadhaarStatus: 'Aadhaar must be 12 digits.',
      panStatus: 'PAN must be 5 letters + 4 digits + 1 letter.',
      voterIdStatus: 'Voter ID must match the expected format.',
      mobileStatus: 'Mobile number must be 10 digits starting with 6-9.',
      uanStatus: 'UAN must be 12 digits.',
    };
    return messageMap[key] ?? 'Invalid document number.';
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
