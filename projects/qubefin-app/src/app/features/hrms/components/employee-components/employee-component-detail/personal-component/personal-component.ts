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
import { EmployeePersonalInfo, IEmployeePersonalInfo, Utility } from '../../../../models/employee-detail';
import { rxResource } from '@angular/core/rxjs-interop';
import { of, tap } from 'rxjs';
import {  MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, MatNativeDateModule } from '@angular/material/core';


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
    LucideDynamicIcon,
    MatDatepickerModule,
    MatNativeDateModule   
  ],
  templateUrl: './personal-component.html',
})
export class PersonalComponentDetail {
  empId = input<string>(EMPTY_UUID);
  utilities = input<Utility[]>([]);
  activeIndex = input<number>(0);
//   onCancel = output<void>();
  onSave = output<void>();
  onUpdate = output<void>();
  
  private dateAdapter= inject(DateAdapter<Date>);
  readonly maxDate = new Date();
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
  protected readonly bloodGroups = computed(() => this.filterUtility('BLOODGROUP'));
  protected readonly maritalStatuses = computed(() => this.filterUtility('MARITALSTATUS'));
  protected readonly genders = computed(() => this.filterUtility('GENDER'));
  protected readonly castes = computed(() => this.filterUtility('CASTE'));
  protected readonly religions = computed(() => this.filterUtility('RELIGION'));
  protected readonly salutations = computed(() => this.filterUtility('SALUTAION')); // Kept matching typo from original code

  private filterUtility(sysKey: string) {
    const list = this.utilities();
    return list.length > 0 ? list.filter((m: any) => m.sysKey === sysKey) : [];
  }
  // constructor() {
    
  //   effect(() => {
  //     const id = this.empId();
  //     if (id && id !== EMPTY_UUID) {
  //       this.employeeStore.setEmployeeComponentId(id);
  //     }
  //   });
  //   effect(() => {
  //     const id = this.empId();
  //     if ( id !== EMPTY_UUID) {
  //       this.employeeService.getPresonalData(id).subscribe(resp => {
  //         this.employeeModel.set(new EmployeePersonalInfo(resp));
  //       })
  //     } else {
  //       this.employeeModel.set(new EmployeePersonalInfo());
  //     }
  //   });
  // }

  // 🚀 Native Angular 20+ Data Fetcher (Replaces all constructor effects & manual mapping leaks)
  private personalDataResource = rxResource({
    params: () => ({ id: this.empId() }),
    stream: ({ params }) => {
      if (params.id && params.id !== EMPTY_UUID) {
        this.employeeStore.setEmployeeComponentId(params.id);
        
        return this.employeeService.getPresonalData(params.id).pipe(
          tap((resp: any) => {
            this.employeeModel.set(new EmployeePersonalInfo(resp));
          })
        );
      } else {
        this.employeeModel.set(new EmployeePersonalInfo());
        return of(null);
      }
    }
  });
  constructor(){
    
    this.dateAdapter.setLocale('en-GB');
  }
  loadBloodGroups(){
    return this.utilities().length > 0 ? this.utilities().filter((m: any) => m.sysKey == "BLOODGROUP") : [];
  }
  
  loadMaritalStatus(){
    return this.utilities().length > 0 ? this.utilities().filter((m: any) => m.sysKey == "MARITALSTATUS") : [];
  }
  
  loadGender(){
    return this.utilities().length > 0 ? this.utilities().filter((m: any) => m.sysKey == "GENDER") : [];
  }
  loadCast(){
    return this.utilities().length > 0 ? this.utilities().filter((m: any) => m.sysKey == "CASTE") : [];
  }
  loadReligion(){
    return this.utilities().length > 0 ? this.utilities().filter((m: any) => m.sysKey == "RELIGION") : [];
  }
  loadSalutation(){
    return this.utilities().length > 0 ? this.utilities().filter((m: any) => m.sysKey == "SALUTAION") : [];
  }
  onSubmit() {
    // console.log(this.employeeForm().value());
    
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
          this.onUpdate.emit();
        },
        error: (err: any) => {
          if (err.error?.isError) {
          }
        }
      });
    }
  }
}