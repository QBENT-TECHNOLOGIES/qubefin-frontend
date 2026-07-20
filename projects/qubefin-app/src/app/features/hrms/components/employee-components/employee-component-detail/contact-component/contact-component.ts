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
import { EmployeeAddressInfo, IEmployeeAddressInfo } from '../../../../models/employee-detail';


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
  onAddressUpdate = output<void>();
  genders = [{id:"M", name:"Male"},{id:"F", name:"Female"},{id:"O", name:"Others"} ];
  maritalStatusList = ["Single","Married","Separated","Divorced","Widowed" ];

  private readonly employeeStore = inject(EmployeeStore);
  private readonly employeeService = inject(EmployeeService);
  readonly iconMap = APP_ICONS_MAP;
  isEditMode = computed(() => !!this.empId() && this.empId() !== EMPTY_UUID);

  protected readonly presentAddressModel = signal<IEmployeeAddressInfo>(new EmployeeAddressInfo());
  protected readonly permanentAddressModel = signal<IEmployeeAddressInfo>(new EmployeeAddressInfo());

  protected readonly employeeAddressSchema: Schema<IEmployeeAddressInfo> = schema((path) => {
    required(path.houseNo, { message: 'house No is required' });
  });

  protected readonly presentAddressForm = form(this.presentAddressModel, this.employeeAddressSchema);
  protected readonly permanentAddressForm = form(this.permanentAddressModel, this.employeeAddressSchema);

  @ViewChild('stepper', { read: ElementRef })
  stepper!: ElementRef;

  constructor() {
    // this.employeeStore.loadCategories();
    effect(() => {
      const id = this.empId();
      if (id && id !== EMPTY_UUID) {
        this.employeeStore.setEmployeeComponentId(id);
      }
    });
    effect(() => {
      if (this.isEditMode() && this.empId() !== EMPTY_UUID) {
        this.employeeService.getAddressData(this.empId()).subscribe((resp: any) => {
        this.employeeStore.setEmployeeComponentId(resp.id);
          this.presentAddressModel.set(new EmployeeAddressInfo(resp.presentAddressInfo));
          // this.presentAddressModel.update(model => ({
          //   houseNo: resp.presentAddressInfo.houseNo ?? '',
          //   roadName: resp.presentAddressInfo.roadName ?? '',
          //   landMark: resp.presentAddressInfo.landMark ?? '',
          //   administrativeUnitId: resp.presentAddressInfo.administrativeUnitId ?? '',
          //   policeStationId: resp.presentAddressInfo.policeStationId ?? '',
          //   postOfficeId: resp.presentAddressInfo.postOfficeId ?? '',
          //   pinCode: resp.presentAddressInfo.pinCode ?? '',
          //   ownerShipOfHouse: resp.presentAddressInfo.ownerShipOfHouse ?? '',
          //   durationOfStayInMonths: resp.presentAddressInfo.durationOfStayInMonths ?? 0,
          // }));

          this.permanentAddressModel.set(new EmployeeAddressInfo(resp.permanentAddressInfo));
        })
       } else {
        this.presentAddressModel.set(new EmployeeAddressInfo());
        this.permanentAddressModel.set(new EmployeeAddressInfo());
      }
    });
  }

  onSubmit() {
    console.log(this.presentAddressForm().value());
    console.log(this.permanentAddressForm().value());
    
    if (!this.presentAddressForm().valid() || !this.permanentAddressForm().valid()) {
      return;
    }

    const dataToSave :  any= {presentAddress :this.presentAddressForm().value(), permanentAddress :this.permanentAddressForm().value()};
    dataToSave.presentAddress.administrativeUnitId = dataToSave.presentAddress.administrativeUnitId == "" ? null : dataToSave.presentAddress.administrativeUnitId;
    dataToSave.presentAddress.policeStationId = dataToSave.presentAddress.policeStationId == "" ? null : dataToSave.presentAddress.policeStationId;
    dataToSave.presentAddress.postOfficeId = dataToSave.presentAddress.postOfficeId == "" ? null : dataToSave.presentAddress.postOfficeId;
    
    dataToSave.permanentAddress.administrativeUnitId = dataToSave.presentAddress.administrativeUnitId == "" ? null : dataToSave.presentAddress.administrativeUnitId;
    dataToSave.permanentAddress.policeStationId = dataToSave.presentAddress.policeStationId == "" ? null : dataToSave.presentAddress.policeStationId;
    dataToSave.permanentAddress.postOfficeId = dataToSave.presentAddress.postOfficeId == "" ? null : dataToSave.presentAddress.postOfficeId;
    if (this.isEditMode()) {
      this.employeeService.updateAddresslInfo( this.empId(),dataToSave).subscribe({
        next: () => {
          this.employeeStore.refreshList();
          this.employeeStore.refreshDetail();
          this.onAddressUpdate.emit();
        },
        error: (err: any) => {
          if (err.error?.isError) {
          }
        }
      });
    }
  }
}