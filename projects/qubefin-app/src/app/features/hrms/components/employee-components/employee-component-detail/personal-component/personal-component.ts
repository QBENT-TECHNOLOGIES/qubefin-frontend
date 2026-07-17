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
import { EmployeePersonalInfo, IEmployeePersonalInfo } from '../../../../models/employee-detail';


@Component({
  selector: 'qfin-personal-component',
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
  templateUrl: './personal-component.html',
})
export class PersonalComponentDetail {
  empId = input<string>(EMPTY_UUID);
  activeIndex = input<number>(0);
//   onCancel = output<void>();
  onSave = output<void>();
  genders = [{id:"M", name:"Male"},{id:"F", name:"Female"},{id:"O", name:"Others"} ];
  maritalStatusList = ["Single","Married","Separated","Divorced","Widowed" ];

  private readonly employeeStore = inject(EmployeeStore);
  private readonly employeeService = inject(EmployeeService);
  readonly iconMap = APP_ICONS_MAP;
  isEditMode = computed(() => !!this.empId() && this.empId() !== EMPTY_UUID);

  protected readonly employeeModel = signal<IEmployeePersonalInfo>(new EmployeePersonalInfo());

  protected readonly employeeSchema: Schema<IEmployeePersonalInfo> = schema((path) => {
    required(path.firstName, { message: 'First name is required' });
    required(path.code, { message: 'code is required' });
    
    required(path.lastName, { message: 'Last name is required' });
    required(path.dateOfBirth, { message: 'Date of birth is required' });
    required(path.gender, { message: 'Gender is required' });
    required(path.maritalStatus, { message: 'Gender is required' });
  });

  protected readonly employeeForm = form(this.employeeModel, this.employeeSchema);

  @ViewChild('stepper', { read: ElementRef })
  stepper!: ElementRef;

  constructor() {
    // effect(() => {
    //     const index = this.activeIndex()
    //     if (index > 0) {
    //     this.employeeStore.setEmployeeComponentId(id);
    //   }
    // })
    // this.employeeStore.loadCategories();
    effect(() => {
      const id = this.empId();
      if (id && id !== EMPTY_UUID) {
        this.employeeStore.setEmployeeComponentId(id);
      }
    });
    effect(() => {
      const id = this.empId();
      if ( id !== EMPTY_UUID) {
        this.employeeService.getPresonalData(id).subscribe(resp => {
          this.employeeModel.set(new EmployeePersonalInfo(resp));
        })
      } else {
        this.employeeModel.set(new EmployeePersonalInfo());
      }
    });
  }

  onSubmit() {
    console.log(this.employeeForm().value());
    
    if (!this.employeeForm().valid()) {
      return;
    }

    const dataToSave = this.employeeForm().value();
    dataToSave.dateOfBirth = new Date(dataToSave.dateOfBirth);
    if (!this.isEditMode()) {
      this.employeeService.create(dataToSave).subscribe({
        next: () => {
          this.employeeStore.refreshList();
          this.onSave.emit();
        },
        error: (err: any) => {
          if (err.error?.isError) {
          }
        }
      });
    } else {
      this.employeeService.updatePersonalInfo( this.empId(),dataToSave).subscribe({
        next: () => {
          this.employeeStore.refreshList();
          this.employeeStore.refreshDetail();
          this.onSave.emit();
        },
        error: (err: any) => {
          if (err.error?.isError) {
          }
        }
      });
    }
  }
}