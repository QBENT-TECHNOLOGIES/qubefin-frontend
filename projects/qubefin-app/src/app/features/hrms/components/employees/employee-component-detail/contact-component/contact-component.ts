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
import {
  EmployeeAddressInfo,
  EmployeeContactInfo,
  IEmployeeAddressInfo,
  IEmployeeContactInfo,
} from '../../../../models/employee-detail';
import { rxResource } from '@angular/core/rxjs-interop';
import { of, tap } from 'rxjs';
import { AttendanceRegularizationsStore } from '../../../../stores/attendance-regularizations-store';

@Component({
  selector: 'qfin-contact-component',
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
  templateUrl: './contact-component.html',
})
export class ContactComponentDetail {
  empId = input<string>(EMPTY_UUID);
  //   onCancel = output<void>();
  onContactUpdate = output<void>();
  private readonly attendRegularizationsStore = inject(AttendanceRegularizationsStore);
  private readonly employeeStore = inject(EmployeeStore);
  private readonly employeeService = inject(EmployeeService);
  private readonly alertService = inject(AlertService);
  readonly iconMap = APP_ICONS_MAP;
  isEditMode = computed(() => !!this.empId() && this.empId() !== EMPTY_UUID);
  readonly reasons = computed(() => {
    const list = this.attendRegularizationsStore.utilities();
    return list.length > 0 ? list.filter((m) => m.sysKey === 'RELATION') : [];
  });
  protected readonly contactModel = signal<IEmployeeContactInfo>(new EmployeeContactInfo());

  protected readonly contactSchema: Schema<IEmployeeContactInfo> = schema((path) => {
    required(path.mobileNo, { message: 'Mobile No is required' });
    pattern(path.mobileNo, /^[6-9]\d{9}$/, { message: 'Enter a valid 10-digit mobile number' });
    pattern(path.personalEmail, /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
      message: 'Enter a valid email address',
    });
    pattern(path.primaryEmergencyMobile, /^[6-9]\d{9}$/, {
      message: 'Enter a valid 10-digit mobile number',
    });

    pattern(path.secondaryEmergencyMobile, /^[6-9]\d{9}$/, {
      message: 'Enter a valid 10-digit mobile number',
    });
  });

  protected readonly contactForm = form(this.contactModel, this.contactSchema);

  @ViewChild('stepper', { read: ElementRef })
  stepper!: ElementRef;

  private contactResource = rxResource({
    params: () => ({ id: this.empId(), editMode: this.isEditMode() }),
    stream: ({ params }) => {
      if (params.editMode && params.id !== EMPTY_UUID) {
        this.employeeStore.setEmployeeComponentId(params.id);

        return this.employeeService.getContactData(params.id).pipe(
          tap((resp: any) => {
            this.employeeStore.setEmployeeComponentId(resp.id);
            this.contactModel.set(new EmployeeContactInfo(resp));
          }),
        );
      } else {
        this.contactModel.set(new EmployeeContactInfo());
        this.contactModel.set(new EmployeeContactInfo());
        return of(null); // Safely stream an empty observable
      }
    },
  });

  onSubmit() {
    if (!this.contactForm().valid()) {
      return;
    }

    const data = this.contactForm().value();
    const dataToSave: any = this.contactForm().value();
    dataToSave.mobileNo = dataToSave.mobileNo == '' ? null : dataToSave.mobileNo;
    dataToSave.personalEmail = dataToSave.personalEmail == '' ? null : dataToSave.personalEmail;
    dataToSave.primaryEmergencyRelation =
      dataToSave.primaryEmergencyRelation == '' ? null : dataToSave.primaryEmergencyRelation;
    dataToSave.primaryEmergencyName =
      dataToSave.primaryEmergencyName == '' ? null : dataToSave.primaryEmergencyName;
    dataToSave.primaryEmergencyMobile =
      dataToSave.primaryEmergencyMobile == '' ? null : dataToSave.primaryEmergencyMobile;
    dataToSave.secondaryEmergencyRelation =
      dataToSave.secondaryEmergencyRelation == '' ? null : dataToSave.secondaryEmergencyRelation;
    dataToSave.secondaryEmergencyName =
      dataToSave.secondaryEmergencyName == '' ? null : dataToSave.secondaryEmergencyName;
    dataToSave.secondaryEmergencyMobile =
      dataToSave.secondaryEmergencyMobile == '' ? null : dataToSave.secondaryEmergencyMobile;

    if (this.isEditMode()) {
      this.employeeService.updateContactInfo(this.empId(), dataToSave).subscribe({
        next: (resp: any) => {
          this.alertService.success('Success', resp).then(() => {
            this.employeeStore.refreshList();
            this.employeeStore.refreshDetail();
            this.onContactUpdate.emit();
          });
        },
        error: (err: any) => {},
      });
    }
  }
}
