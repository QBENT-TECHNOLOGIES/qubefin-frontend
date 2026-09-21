import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  input,
  output,
  signal,
  ViewChild,
  ElementRef,
  effect,
  untracked,
  AfterViewInit,
} from '@angular/core';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService, EMPTY_UUID } from 'qubefin-core';

import { CandidateStore } from '../../../../stores/candidate-store';
import { CandidateService } from '../../../../services/candidate-service';
import { ICandidate, ICandidateUpdate } from '../../../../models/candidate';
import { BasicComponent } from './basic-component/basic-component';

// Import your child step components here as you build them
// import { BasicComponent } from './basic-component/basic-component';
// import { ContactComponent } from './contact-component/contact-component';
// import { AddressComponent } from './address-component/address-component';
// import { KycComponent } from './kyc-component/kyc-component';
// import { BankingComponent } from './banking-component/banking-component';
// import { EmployeeReferralComponent } from './employee-referral-component/employee-referral-component';
// import { EducationComponent } from './education-component/education-component';
// import { ExperienceComponent } from './experience-component/experience-component';
// import { FamilyComponent } from './family-component/family-component';
// import { NomineeComponent } from './nominee-component/nominee-component';
// import { ReferenceComponent } from './reference-component/reference-component';

@Component({
  selector: 'qfin-candidate-joining-info',
  imports: [
    CommonModule,
    MatStepperModule,
    LucideDynamicIcon,
    BasicComponent,
    // Add child components to imports once created
    // BasicComponent, ContactComponent, AddressComponent, etc.
  ],
  templateUrl: './candidate-joining-info.html',
})
export class CandidateJoiningInfo implements AfterViewInit {
  candidateId = input<string>(EMPTY_UUID);
  candidateData = input.required<ICandidateUpdate>();
  onProcessComplete = output<void>();

  readonly activeStepIndex = signal(0);

  // Master state holding the unified interface data
  readonly candidateMasterData = signal<ICandidateUpdate | null>(null);
  // readonly candidateData = signal<ICandidate | null>(null);

  private readonly candidateStore = inject(CandidateStore);
  private readonly candidateService = inject(CandidateService);
  private readonly alertService = inject(AlertService);

  @ViewChild('stepper', { read: ElementRef })
  stepper!: ElementRef;

  @ViewChild('stepper')
  matStepper!: MatStepper;

  constructor() {
    // 1. Fetch data once by setting the ID in the store
    effect(
      () => {
        const data = this.candidateData();

        if (data) {
          this.candidateMasterData.set(this.mapToUpdateModel(data));
        }
      },
      { allowSignalWrites: true },
    );
  }

  ngAfterViewInit() {
    // Enables horizontal scrolling on the stepper header (replicated from employee-component-detail)
    const header = this.stepper?.nativeElement?.querySelector(
      '.mat-horizontal-stepper-header-container',
    );

    if (!header) return;

    header.addEventListener(
      'wheel',
      (event: WheelEvent) => {
        event.preventDefault();
        header.scrollBy({
          left: event.deltaY,
          behavior: 'smooth',
        });
      },
      { passive: false },
    );
  }

  onStepChange(index: number) {
    this.activeStepIndex.set(index);
  }

  /**
   * Receives partial data from a specific child step component,
   * merges it into the master payload, and triggers the single API call.
   */
  handleStepSave(stepPartialData: Partial<ICandidateUpdate>, nextStepIndex: number) {
    const currentMaster = this.candidateMasterData();
    if (!currentMaster) return;

    // Dynamically construct payload: Master data overwritten by specific step updates
    const updatedPayload: ICandidateUpdate = {
      ...currentMaster,
      ...stepPartialData,
    };

    // Single Update API Call
    this.candidateService.updateCandidate(this.candidateId(), updatedPayload).subscribe({
      next: (res: any) => {
        this.alertService.success('Success', 'Information updated successfully').then(() => {
          // 1. Update the local master state to reflect the saved changes
          this.candidateMasterData.set(updatedPayload);

          // 2. Refresh the store so the view gets the latest data globally
          this.candidateStore.refreshDetail();

          // 3. Move to the next step
          if (nextStepIndex > -1) {
            this.activeStepIndex.set(nextStepIndex);
            if (this.matStepper) {
              this.matStepper.selectedIndex = nextStepIndex;
            }
          } else {
            // If nextStepIndex is -1 (or similar logic), it means we're done
            this.onProcessComplete.emit();
          }
        });
      },
      error: (err: any) => {
        this.alertService.error('Error', err?.error?.message || 'Failed to update information');
      },
    });
  }

  /**
   * Safely maps the incoming GET API read model to your strict ICandidateUpdate form model.
   * Ensures no 'undefined' values cause strict type errors in child forms.
   */
  /**
   * Safely maps the incoming GET API read model to your strict ICandidateUpdate form model.
   */
  private mapToUpdateModel(data: any): ICandidateUpdate {
    return {
      id: data.id || '',

      // ============================================================
      // 1. BASIC INFORMATION
      // ============================================================
      prefix: data.prefix || '',
      firstName: data.firstName || '',
      middleName: data.middleName || '',
      lastName: data.lastName || '',
      employeeName: data.employeeName || '',
      fatherName: data.fatherName || '',
      motherName: data.motherName || '',
      dateOfBirth: data.dateOfBirth || null,
      gender: data.gender || '',
      religion: data.religion || '',
      caste: data.caste || '',
      bloodGroup: data.bloodGroup || '',
      disabilityType: data.disabilityType || '',
      nationality: data.nationality || '',

      // ============================================================
      // 2. KYC DETAILS
      // ============================================================
      panNumber: data.panNumber || '',
      aadharNumber: data.aadharNumber || '',
      voterIdNumber: data.voterIdNumber || '',
      passportNumber: data.passportNumber || '',
      passportValidityFrom: data.passportValidityFrom || null,
      passportValidityTo: data.passportValidityTo || null,
      drivingLicenseNumber: data.drivingLicenseNumber || '',
      drivingLicenseExpiryDate: data.drivingLicenseExpiryDate || null,

      // ============================================================
      // 3. CONTACT DETAILS
      // ============================================================
      mobileNo: data.mobileNo || '',
      personalEmail: data.personalEmail || '',
      primaryEmergencyRelation: data.primaryEmergencyRelation || '',
      primaryEmergencyName: data.primaryEmergencyName || '',
      primaryEmergencyMobile: data.primaryEmergencyMobile || '',
      secondaryEmergencyRelation: data.secondaryEmergencyRelation || '',
      secondaryEmergencyName: data.secondaryEmergencyName || '',
      secondaryEmergencyMobile: data.secondaryEmergencyMobile || '',

      // ============================================================
      // 4. ADDRESS DETAILS
      // ============================================================
      presentAddressInfo: data.presentAddressInfo || {
        houseNo: '',
        roadName: '',
        landMark: '',
        administrativeUnitId: '',
        policeStationId: '',
        postOfficeId: '',
        pinCode: '',
        ownerShipOfHouse: '',
        durationOfStayInMonths: 0,
      },
      permanentAddressInfo: data.permanentAddressInfo || {
        houseNo: '',
        roadName: '',
        landMark: '',
        administrativeUnitId: '',
        policeStationId: '',
        postOfficeId: '',
        pinCode: '',
        ownerShipOfHouse: '',
        durationOfStayInMonths: 0,
      },
      isSameAsPresentAddress: data.isSameAsPresentAddress || false,

      // ============================================================
      // 5. EDUCATION DETAILS
      // ============================================================
      latestQualification: data.latestQualification || '',
      academicStream: data.academicStream || '',
      specialization: data.specialization || '',
      yearOfPassing: data.yearOfPassing || null,
      universityOrBoard: data.universityOrBoard || '',
      collegeOrSchool: data.collegeOrSchool || '',
      gradeOrCgpaOrPercentage: data.gradeOrCgpaOrPercentage || '',

      // ============================================================
      // 6. PROFESSIONAL EXPERIENCE
      // ============================================================
      experiences: data.experiences || [],

      // ============================================================
      // 7. FAMILY DETAILS
      // ============================================================
      maritalStatus: data.maritalStatus || '',
      spouseName: data.spouseName || '',

      // ============================================================
      // 8. DEPENDENT & NOMINEE DETAILS
      // ============================================================
      nominees: data.nominees || [],

      // ============================================================
      // 9. BANK DETAILS
      // ============================================================
      accountNumber: data.accountNumber || '',
      ifscCode: data.ifscCode || '',
      bankHolderName: data.bankHolderName || '',
      bankName: data.bankName || '',
      branchName: data.branchName || '',
      accountType: data.accountType || '',

      // ============================================================
      // 10. REFERENCE DETAILS
      // ============================================================
      references: data.references || [],

      // ============================================================
      // 11. EMPLOYEE REFERRAL INFORMATION
      // ============================================================
      isReferred: data.isReferred || false,
      referralEmployeeName: data.referralEmployeeName || '',
      referralDesignation: data.referralDesignation || '',
      referralEmployeeCode: data.referralEmployeeCode || '',
      referralHowDoYouKnow: data.referralHowDoYouKnow || '',
    };
  }
}
