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
} from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { EMPTY_UUID } from 'qubefin-core';
import { LucideDynamicIcon } from '@lucide/angular';
import { rxResource } from '@angular/core/rxjs-interop';
import { of, tap } from 'rxjs';
import { EmployeeStore } from '../../../../stores/employee-store';
import { CandidateStore } from '../../../../stores/candidate-store';
import { CandidateJoiningService } from '../../../../services/candidate-joining.service';
import { ICandidateJoiningInfo } from '../../../../models/candidate';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { JoiningPersonalComponent } from './personal-component/personal-component';
import { JoiningAddressComponent } from './address-component/address-component';
import { JoiningContactComponent } from './contact-component/contact-component';
import { JoiningOfficialComponent } from './official-component/official-component';
import { JoiningKycDocumentComponent } from './kyc-document-component/kyc-document-component';
import { JoiningReferenceComponent } from './reference-component/reference-component';
import { JoiningEmploymentComponent } from './employment-component/employment-component';
import { JoiningQualificationComponent } from './qualification-component/qualification-component';
import { JoiningBankingComponent } from './banking-component/banking-component';
import { JoiningNomineeComponent } from './nominee-component/nominee-component';
import { JoiningReferralComponent } from './referral-component/referral-component';

// Joining information of a candidate, captured the same way as the employee detail. The Personal step creates
// the employee from the candidate; the remaining steps open once it exists and write into that employee.
@Component({
  selector: 'qfin-candidate-joining-info',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatCheckboxModule,
    MatStepperModule,
    LucideDynamicIcon,
    JoiningPersonalComponent,
    JoiningAddressComponent,
    JoiningContactComponent,
    JoiningOfficialComponent,
    JoiningKycDocumentComponent,
    JoiningReferenceComponent,
    JoiningEmploymentComponent,
    JoiningQualificationComponent,
    JoiningBankingComponent,
    JoiningNomineeComponent,
    JoiningReferralComponent,
  ],
  templateUrl: './candidate-joining-info.html',
})
export class CandidateJoiningInfo {
  emptyGuid = EMPTY_UUID;
  candidateId = input<string>(EMPTY_UUID);
  onProcessComplete = output<void>();

  readonly activeStepIndex = signal(0);
  // The employee created from the candidate - empty until the Personal step is saved.
  readonly employeeId = signal<string>(EMPTY_UUID);
  // The candidate's identity details and verification flags - drive prefill and the read-only verified fields.
  readonly joiningInfo = signal<ICandidateJoiningInfo | null>(null);
  private readonly employeeStore = inject(EmployeeStore);
  private readonly candidateStore = inject(CandidateStore);
  private readonly candidateJoiningService = inject(CandidateJoiningService);
  utilityComponents = this.employeeStore.utilityComponent;
  kycComponents = this.employeeStore.kycComponent;

  @ViewChild('stepper', { read: ElementRef })
  stepper!: ElementRef;
  @ViewChild('stepper')
  matStepper!: MatStepper;

  private joiningInfoResource = rxResource({
    params: () => ({ id: this.candidateId() }),
    stream: ({ params }) => {
      if (params.id && params.id !== EMPTY_UUID) {
        return this.candidateJoiningService.getJoiningInfo(params.id).pipe(
          tap((resp) => {
            this.joiningInfo.set(resp ?? null);
            this.employeeId.set(resp?.employeeId ?? EMPTY_UUID);
          }),
        );
      }
      this.joiningInfo.set(null);
      this.employeeId.set(EMPTY_UUID);
      return of(null);
    },
  });

  constructor() {
    effect(() => {
      const id = this.candidateId();

      if (id === EMPTY_UUID) {
        untracked(() => {
          this.activeStepIndex.set(0);

          if (this.matStepper) {
            this.matStepper.reset();
          }
        });
      }
    });
  }
  onStepChange(index: number) {
    this.activeStepIndex.set(index);
  }
  handlePersonal() {
    this.onStepChange(1);
  }
  handleContact() {
    this.onStepChange(2);
  }
  handleAddress() {
    this.onStepChange(3);
  }
  handleKyc() {
    this.onStepChange(4);
  }
  handleOfficial() {
    this.onStepChange(5);
  }
  handleQualification() {
    this.onStepChange(6);
  }
  handleEmployment() {
    this.onStepChange(7);
  }
  handlePayroll() {
    this.onStepChange(8);
  }
  handleNominee() {
    this.onStepChange(9);
  }
  handleReference() {
    this.onStepChange(10);
  }
  // Last step - the joining information is complete.
  handleReferral() {
    this.candidateStore.refreshDetail();
    this.onProcessComplete.emit();
  }
  // First save of the Personal step - the employee now exists, so the other steps render; move on once they have.
  handleSave(newId?: string) {
    if (newId && newId.length > 20) {
      this.employeeId.set(newId);
      this.candidateStore.refreshDetail();
      setTimeout(() => this.onStepChange(1));
    }
  }

  ngAfterViewInit() {
    const header = this.stepper.nativeElement.querySelector(
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
}
