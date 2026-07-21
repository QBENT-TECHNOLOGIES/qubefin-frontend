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
import { rxResource } from '@angular/core/rxjs-interop';
import { of, tap } from 'rxjs';
import { EmployeeOfficialInfo, IEmployeeOfficialInfo } from '../../../../models/employee-detail';

@Component({
  selector: 'qfin-official-component',
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
  templateUrl: './official-component.html',
})
export class OfficialComponentDetail {
  empId = input<string>(EMPTY_UUID);
//   onCancel = output<void>();
  onOfficialUpdate = output<void>();

  private readonly employeeStore = inject(EmployeeStore);
  private readonly employeeService = inject(EmployeeService);
  readonly iconMap = APP_ICONS_MAP;
  isEditMode = computed(() => !!this.empId() && this.empId() !== EMPTY_UUID);

  protected readonly officialModel = signal<IEmployeeOfficialInfo>(new EmployeeOfficialInfo());

  protected readonly officialSchema: Schema<IEmployeeOfficialInfo> = schema((path) => {
    required(path.officialEmail, { message: 'Official Email is required' });
  });

  protected readonly officialForm = form(this.officialModel, this.officialSchema);

  @ViewChild('stepper', { read: ElementRef })
  stepper!: ElementRef;

  
   private officialResource = rxResource({
    params: () => ({ id: this.empId(), editMode: this.isEditMode() }),
    stream: ({ params }) => {
      if (params.editMode && params.id !== EMPTY_UUID) {
        this.employeeStore.setEmployeeComponentId(params.id);
        
        return this.employeeService.getOfficialData(params.id).pipe(
          tap((resp: any) => {
            this.employeeStore.setEmployeeComponentId(resp.id);
            this.officialModel.set(new EmployeeOfficialInfo(resp));
          })
        );
      } else {
        this.officialModel.set(new EmployeeOfficialInfo());
        this.officialModel.set(new EmployeeOfficialInfo());
        return of(null); // Safely stream an empty observable
      }
    }
  });

  onSubmit() {
    // console.log(this.presentAddressForm().value());
    // console.log(this.permanentAddressForm().value());
    
    if (!this.officialForm().valid()) {
      return;
    }

    const data = this.officialForm().value();
    const dataToSave: any = this.officialForm().value();
    dataToSave.companyId = dataToSave.companyId == "" ? null : dataToSave.companyId;
    dataToSave.organizationUnitId = dataToSave.organizationUnitId == "" ? null : dataToSave.organizationUnitId;
    dataToSave.departmentId = dataToSave.departmentId == "" ? null : dataToSave.departmentId;
    dataToSave.employementType = dataToSave.employementType == "" ? null : dataToSave.employementType;
    dataToSave.joiningDate = dataToSave.joiningDate == "" ? null : new Date(dataToSave.joiningDate);
    dataToSave.confirmationDate = dataToSave.confirmationDate == "" ? null : new Date(dataToSave.confirmationDate);
    dataToSave.separationDate = dataToSave.separationDate == "" ? null : new Date(dataToSave.separationDate);
    dataToSave.referedBy = dataToSave.referedBy == "" ? null : dataToSave.referedBy;
    dataToSave.howYouKnow = dataToSave.howYouKnow == "" ? null : dataToSave.howYouKnow;
    dataToSave.officialEmail = dataToSave.officialEmail == "" ? null : dataToSave.officialEmail;
    dataToSave.isActive = dataToSave.isActive == "" ? false : dataToSave.isActive;
    
    if (this.isEditMode()) {
      this.employeeService.updateOfficialInfo( this.empId(),dataToSave).subscribe({
        next: () => {
          this.employeeStore.refreshList();
          this.employeeStore.refreshDetail();
          this.onOfficialUpdate.emit();
        },
        error: (err: any) => {
          if (err.error?.isError) {
          }
        }
      });
    }
  }
}