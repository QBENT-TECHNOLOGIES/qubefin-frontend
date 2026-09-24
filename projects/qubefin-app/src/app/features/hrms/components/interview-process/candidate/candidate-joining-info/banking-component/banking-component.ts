import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { accountType, AlertService, EMPTY_UUID } from 'qubefin-core';
import { form, FormField, pattern, readonly, required, schema, Schema } from '@angular/forms/signals';
import { LucideDynamicIcon } from '@lucide/angular';
import { MatStepperModule } from '@angular/material/stepper';
import { EmployeeService } from '../../../../../services/employee-service';
import { ICandidateJoiningInfo, withCandidateBanking } from '../../../../../models/candidate';
import { APP_ICONS_MAP } from '../../../../../../../lucide-icons';
import { rxResource } from '@angular/core/rxjs-interop';
import { of, tap } from 'rxjs';
import {
  EmployeeOfficialInfo,
  EmployeePayrollInfo,
  IEmployeeOfficialInfo,
  IEmployeePayrollInfo,
} from '../../../../../models/employee-detail';
import { CompanyStore } from '../../../../../../global/stores/company-store';

@Component({
  selector: 'qfin-joining-banking-component',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatCheckboxModule,
    FormField,
    MatStepperModule,
    LucideDynamicIcon,
  ],
  templateUrl: './banking-component.html',
})
export class JoiningBankingComponent {
  employeeId = input<string>(EMPTY_UUID);
  // Candidate details - fill what the employee doesn't have yet and lock what Candidate Verification confirmed.
  joiningInfo = input<ICandidateJoiningInfo | null>(null);
  readonly isUanVerified = computed(() => !!this.joiningInfo()?.isUanVerified);
  //   onCancel = output<void>();
  onBankingUpdate = output<void>();

  private readonly companyStore = inject(CompanyStore);
  private readonly employeeService = inject(EmployeeService);
  private readonly alertService = inject(AlertService);
  readonly iconMap = APP_ICONS_MAP;
  readonly acTypes = accountType;

  readonly banks = this.companyStore.banks;
  isEditMode = computed(() => !!this.employeeId() && this.employeeId() !== EMPTY_UUID);

  protected readonly bankingModel = signal<IEmployeePayrollInfo>(new EmployeePayrollInfo());

  protected readonly bankingSchema: Schema<IEmployeePayrollInfo> = schema((path) => {
    required(path.bankId, { message: 'Bank is required' });
    readonly(path.universalAccountNumber, { when: () => this.isUanVerified() });
    required(path.bankAccountType, { message: 'Account Type is required' });
    required(path.ifscCode, { message: 'IFSC Code is required' });
    required(path.esiIpNumber, {
      when: () => this.bankingModel().hasEsiEligible,
      message: 'ESI No. required.',
    });
    required(path.bankAccountNo, { message: 'Account Number is required' });
    pattern(path.bankAccountNo as any, /^\d{9,20}$/, {
      message: 'Invalid Acc no.',
    });
    pattern(path.universalAccountNumber, /^\d{12}$/, {
      message: 'Invalid UAN no',
    });
    pattern(path.ifscCode, /^[A-Z]{4}0[A-Z0-9]{6}$/, {
      message: 'Invalid IFSC Code',
    });
    pattern(path.pfAccountNo, /^\d{7,15}$/, {
      message: 'InvalidPF Acc No',
    });
  });

  protected readonly bankingForm = form(this.bankingModel, this.bankingSchema);

  @ViewChild('stepper', { read: ElementRef })
  stepper!: ElementRef;

  private bankingResource = rxResource({
    params: () => ({ id: this.employeeId(), editMode: this.isEditMode() }),
    stream: ({ params }) => {
      if (params.editMode && params.id !== EMPTY_UUID) {
        return this.employeeService.getBankingInfoData(params.id).pipe(
          tap((resp: any) => {
            resp = withCandidateBanking(resp, this.joiningInfo());
            this.bankingModel.set(new EmployeePayrollInfo(resp));
            this.bankingModel.update((state) => ({
              ...state,
            }));
          }),
        );
      } else {
        this.bankingModel.set(new EmployeePayrollInfo());
        return of(null); // Safely stream an empty observable
      }
    },
  });

  onSubmit() {
    this.bankingForm().markAsTouched();
    if (!this.bankingForm().valid()) {
      return;
    }

    const data = this.bankingForm().value();
    const dataToSave: any = this.bankingForm().value();
    dataToSave.bankId = dataToSave.bankId == '' ? null : dataToSave.bankId;
    dataToSave.bankAccountNo = dataToSave.bankAccountNo ? dataToSave.bankAccountNo : null;
    dataToSave.bankHolderName = dataToSave.bankHolderName == '' ? null : dataToSave.bankHolderName;
    dataToSave.bankBranch = dataToSave.bankBranch == '' ? null : dataToSave.bankBranch;
    dataToSave.bankAccountType =
      dataToSave.bankAccountType == '' ? null : dataToSave.bankAccountType;
    dataToSave.hasEsiEligible = dataToSave.hasEsiEligible;
    dataToSave.esiIpNumber = dataToSave.esiIpNumber == '' ? null : dataToSave.esiIpNumber;
    dataToSave.universalAccountNumber =
      dataToSave.universalAccountNumber == '' ? null : dataToSave.universalAccountNumber;
    dataToSave.isPayrollActive = dataToSave.isPayrollActive;
    dataToSave.pfAccountNo = dataToSave.pfAccountNo == '' ? null : dataToSave.pfAccountNo;
    dataToSave.ifscCode = dataToSave.ifscCode == '' ? null : dataToSave.ifscCode;

    if (this.isEditMode()) {
      this.employeeService.updateBankingInfo(this.employeeId(), dataToSave).subscribe({
        next: (resp: any) => {
          this.alertService.success('Success', resp).then(() => {
            this.onBankingUpdate.emit();
          });
        },
        error: (err: any) => {
          if (err.error?.isError) {
          }
        },
      });
    }
  }
}
