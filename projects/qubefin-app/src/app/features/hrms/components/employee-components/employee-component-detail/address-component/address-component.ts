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
import { EmployeeAddressInfo, IEmployeeAddressInfo, Utility } from '../../../../models/employee-detail';
import { rxResource } from '@angular/core/rxjs-interop';
import { of, tap } from 'rxjs';


@Component({
  selector: 'qfin-address-component',
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
  templateUrl: './address-component.html',
})
export class AddressComponentDetail {
  empId = input<string>(EMPTY_UUID);
  utilities = input<Utility[]>([]);
  onAddressUpdate = output<void>();
  policeStations = [];
  postOffices = [];

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
          

  //         this.permanentAddressModel.set(new EmployeeAddressInfo(resp.permanentAddressInfo));
  //       })
  //      } else {
  //       this.presentAddressModel.set(new EmployeeAddressInfo());
  //       this.permanentAddressModel.set(new EmployeeAddressInfo());
  //     }
  //   });
  // }
   // 🚀 Replaces both effects! Safely streams, cancels stale requests, and maps components
    // 🚀 Fixed signature for rxResource compatibility
    // 🚀 Updated config naming convention for Angular 20+
  private addressResource = rxResource({
    params: () => ({ id: this.empId(), editMode: this.isEditMode() }), // 👈 "request" becomes "params"
    stream: ({ params }) => {                                         // 👈 "loader" becomes "stream"
      if (params.editMode && params.id !== EMPTY_UUID) {
        this.employeeStore.setEmployeeComponentId(params.id);
        
        return this.employeeService.getAddressData(params.id).pipe(
          tap((resp: any) => {
            this.employeeStore.setEmployeeComponentId(resp.id);
            this.presentAddressModel.set(new EmployeeAddressInfo(resp.presentAddressInfo));
            this.permanentAddressModel.set(new EmployeeAddressInfo(resp.permanentAddressInfo));
          })
        );
      } else {
        this.presentAddressModel.set(new EmployeeAddressInfo());
        this.permanentAddressModel.set(new EmployeeAddressInfo());
        return of(null); // Ensure "of" is imported from 'rxjs'
      }
    }
  });



  onSubmit() {
    // console.log(this.presentAddressForm().value());
    // console.log(this.permanentAddressForm().value());
    
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