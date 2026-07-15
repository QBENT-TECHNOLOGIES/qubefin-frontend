import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { EMPTY_UUID } from 'qubefin-core';
import { form, FormField, required, schema, Schema } from '@angular/forms/signals';
import { LucideSquarePen } from '@lucide/angular';
import { EmployeeStore } from '../../../stores/employee-store';
import { EmployeeService } from '../../../services/employee-service';
import { EmployeePersonalInfo, IEmployeePersonalInfo } from '../../../models/employee-detail';

@Component({
  selector: 'qfin-employee-component-detail',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatCheckboxModule,
    FormField,
    LucideSquarePen
  ],
  templateUrl: './employee-component-detail.html',
})
export class EmployeeComponentDetail {
  employeeId = input<string>(EMPTY_UUID);
  onCancel = output<void>();
  onSave = output<void>();
  genders = [{id:"M", name:"Male"},{id:"F", name:"Female"},{id:"O", name:"Others"} ];
  maritalStatusList = ["Single","Married","Separated","Divorced","Widowed" ];

  private readonly employeeStore = inject(EmployeeStore);
  private readonly employeeService = inject(EmployeeService);

  isEditMode = computed(() => !!this.employeeId() && this.employeeId() !== EMPTY_UUID);

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

  constructor() {
    // this.employeeStore.loadCategories();
    effect(() => {
      const id = this.employeeId();
      if (id && id !== EMPTY_UUID) {
        this.employeeStore.setEmployeeComponentId(id);
      }
    });
    effect(() => {
      if (this.isEditMode()) {
        const detail = this.employeeStore.employeeInfoComponent();
        if (detail) {
          this.employeeModel.set(new EmployeePersonalInfo(detail));
        }
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
      this.employeeService.updatePersonalInfo( this.employeeId(),dataToSave).subscribe({
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

  onCancelClicked() {
    this.onCancel.emit();
  }
}