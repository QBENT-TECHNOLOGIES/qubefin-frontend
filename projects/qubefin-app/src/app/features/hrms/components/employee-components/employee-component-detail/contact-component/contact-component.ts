import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal, ViewChild, ElementRef } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { EMPTY_UUID } from 'qubefin-core';
import { form, FormField, required, schema, Schema } from '@angular/forms/signals';
import { LucideDynamicIcon } from '@lucide/angular';
import { MatStepperModule } from '@angular/material/stepper';
import { EmployeeStore } from '../../../../stores/employee-store';
import { EmployeeService } from '../../../../services/employee-service';
import { APP_ICONS_MAP } from '../../../../../../lucide-icons';
import { EmployeeAddressInfo, EmployeeContactInfo, IEmployeeAddressInfo, IEmployeeContactInfo } from '../../../../models/employee-detail';
import { rxResource } from '@angular/core/rxjs-interop';
import { of, tap } from 'rxjs';


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
    LucideDynamicIcon
  ],
  templateUrl: './contact-component.html',
})
export class ContactComponentDetail {
  empId = input<string>(EMPTY_UUID);
//   onCancel = output<void>();
  onContactUpdate = output<void>();

  private readonly employeeStore = inject(EmployeeStore);
  private readonly employeeService = inject(EmployeeService);
  readonly iconMap = APP_ICONS_MAP;
  isEditMode = computed(() => !!this.empId() && this.empId() !== EMPTY_UUID);

  protected readonly contactModel = signal<IEmployeeContactInfo>(new EmployeeContactInfo());

  protected readonly contactSchema: Schema<IEmployeeContactInfo> = schema((path) => {
    required(path.mobileNo, { message: 'Mobile No is required' });
  });

  protected readonly contactForm = form(this.contactModel, this.contactSchema);

  @ViewChild('stepper', { read: ElementRef })
  stepper!: ElementRef;

  // constructor() {
  //   // this.employeeStore.loadCategories();
  //   effect(() => {
  //     const id = this.empId();
  //     if (id && id !== EMPTY_UUID) {
  //       this.employeeStore.setEmployeeComponentId(id);
  //     }
  //   });
  //   effect(() => {
  //     if (this.isEditMode() && this.empId() !== EMPTY_UUID) {
  //       this.employeeService.getAddressData(this.empId()).subscribe((resp: any) => {
  //       this.employeeStore.setEmployeeComponentId(resp.id);
  //         this.presentAddressModel.set(new EmployeeAddressInfo(resp.presentAddressInfo));
  //         // this.presentAddressModel.update(model => ({
  //         //   houseNo: resp.presentAddressInfo.houseNo ?? '',
  //         //   roadName: resp.presentAddressInfo.roadName ?? '',
  //         //   landMark: resp.presentAddressInfo.landMark ?? '',
  //         //   administrativeUnitId: resp.presentAddressInfo.administrativeUnitId ?? '',
  //         //   policeStationId: resp.presentAddressInfo.policeStationId ?? '',
  //         //   postOfficeId: resp.presentAddressInfo.postOfficeId ?? '',
  //         //   pinCode: resp.presentAddressInfo.pinCode ?? '',
  //         //   ownerShipOfHouse: resp.presentAddressInfo.ownerShipOfHouse ?? '',
  //         //   durationOfStayInMonths: resp.presentAddressInfo.durationOfStayInMonths ?? 0,
  //         // }));

  //         this.permanentAddressModel.set(new EmployeeAddressInfo(resp.permanentAddressInfo));
  //       })
  //      } else {
  //       this.presentAddressModel.set(new EmployeeAddressInfo());
  //       this.permanentAddressModel.set(new EmployeeAddressInfo());
  //     }
  //   });
  // }
   private addressResource = rxResource({
    params: () => ({ id: this.empId(), editMode: this.isEditMode() }),
    stream: ({ params }) => {
      if (params.editMode && params.id !== EMPTY_UUID) {
        this.employeeStore.setEmployeeComponentId(params.id);
        
        return this.employeeService.getContactData(params.id).pipe(
          tap((resp: any) => {
            this.employeeStore.setEmployeeComponentId(resp.id);
            this.contactModel.set(new EmployeeContactInfo(resp));
          })
        );
      } else {
        this.contactModel.set(new EmployeeContactInfo());
        this.contactModel.set(new EmployeeContactInfo());
        return of(null); // Safely stream an empty observable
      }
    }
  });

  onSubmit() {
    // console.log(this.presentAddressForm().value());
    // console.log(this.permanentAddressForm().value());
    
    if (!this.contactForm().valid()) {
      return;
    }

    const data = this.contactForm().value();
    const dataToSave: any = this.contactForm().value();
    dataToSave.mobileNo = dataToSave.personalEmail == "" ? null : dataToSave.mobileNo;
    dataToSave.personalEmail = dataToSave.personalEmail == "" ? null : dataToSave.personalEmail;
    dataToSave.primaryEmergencyRelation = dataToSave.primaryEmergencyRelation == "" ? null : dataToSave.primaryEmergencyRelation;
    dataToSave.primaryEmergencyName = dataToSave.primaryEmergencyName == "" ? null : dataToSave.primaryEmergencyName;
    dataToSave.primaryEmergencyMobile = dataToSave.primaryEmergencyMobile == "" ? null : dataToSave.primaryEmergencyMobile;
    dataToSave.secondaryEmergencyRelation = dataToSave.secondaryEmergencyRelation == "" ? null : dataToSave.secondaryEmergencyRelation;
    dataToSave.secondaryEmergencyName = dataToSave.secondaryEmergencyName == "" ? null : dataToSave.secondaryEmergencyName;
    dataToSave.secondaryEmergencyMobile = dataToSave.secondaryEmergencyMobile == "" ? null : dataToSave.secondaryEmergencyMobile;
    
    if (this.isEditMode()) {
      this.employeeService.updateContactInfo( this.empId(),dataToSave).subscribe({
        next: () => {
          this.employeeStore.refreshList();
          this.employeeStore.refreshDetail();
          this.onContactUpdate.emit();
        },
        error: (err: any) => {
          if (err.error?.isError) {
          }
        }
      });
    }
  }
}