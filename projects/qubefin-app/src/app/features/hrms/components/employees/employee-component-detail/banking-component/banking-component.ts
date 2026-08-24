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
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import { form, FormField, pattern, required, schema, Schema } from '@angular/forms/signals';
import { LucideDynamicIcon } from '@lucide/angular';
import { MatStepperModule } from '@angular/material/stepper';
import { EmployeeStore } from '../../../../stores/employee-store';
import { EmployeeService } from '../../../../services/employee-service';
import { APP_ICONS_MAP } from '../../../../../../lucide-icons';
import { rxResource } from '@angular/core/rxjs-interop';
import { of, tap } from 'rxjs';
import {
  EmployeeOfficialInfo,
  EmployeePayrollInfo,
  IEmployeeOfficialInfo,
  IEmployeePayrollInfo,
} from '../../../../models/employee-detail';

@Component({
  selector: 'qfin-banking-component',
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
export class BankingComponentDetail {
  empId = input<string>(EMPTY_UUID);
  //   onCancel = output<void>();
  onBankingUpdate = output<void>();

  private readonly employeeStore = inject(EmployeeStore);
  private readonly employeeService = inject(EmployeeService);
  private readonly alertService = inject(AlertService);
  readonly iconMap = APP_ICONS_MAP;
  isEditMode = computed(() => !!this.empId() && this.empId() !== EMPTY_UUID);

  protected readonly bankingModel = signal<IEmployeePayrollInfo>(new EmployeePayrollInfo());

  protected readonly bankingSchema: Schema<IEmployeePayrollInfo> = schema((path) => {
    pattern(path.bankAccountNo as any, /^\d{9,15}$/, {
      message: 'Account number must be between 9 and 15 digits',
    });
    pattern(path.universalAccountNumber, /^\d{12}$/, {
      message: 'Account number must be between 9 and 15 digits',
    });
  });

  protected readonly bankingForm = form(this.bankingModel, this.bankingSchema);

  @ViewChild('stepper', { read: ElementRef })
  stepper!: ElementRef;

  private bankingResource = rxResource({
    params: () => ({ id: this.empId(), editMode: this.isEditMode() }),
    stream: ({ params }) => {
      if (params.editMode && params.id !== EMPTY_UUID) {
        return this.employeeService.getBankingInfoData(params.id).pipe(
          tap((resp: any) => {
            this.employeeStore.setEmployeeComponentId(resp.id);
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
    // console.log(this.presentAddressForm().value());
    // console.log(this.permanentAddressForm().value());

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

    if (this.isEditMode()) {
      this.employeeService.updateBankingInfo(this.empId(), dataToSave).subscribe({
        next: (resp: any) => {
          this.alertService.success('Success', resp).then(() => {
            this.employeeStore.refreshList();
            this.employeeStore.refreshDetail();
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
