import { CommonModule, DatePipe } from '@angular/common';
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
import {
  disabled,
  form,
  FormField,
  pattern,
  readonly,
  required,
  schema,
  Schema,
} from '@angular/forms/signals';
import { LucideDynamicIcon } from '@lucide/angular';
import { MatStepperModule } from '@angular/material/stepper';
import { EmployeeStore } from '../../../../stores/employee-store';
import { EmployeeService } from '../../../../services/employee-service';
import { APP_ICONS_MAP } from '../../../../../../lucide-icons';
import { rxResource } from '@angular/core/rxjs-interop';
import { of, tap } from 'rxjs';
import { EmployeeOfficialInfo, IEmployeeOfficialInfo } from '../../../../models/employee-detail';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, MatNativeDateModule } from '@angular/material/core';
import { OrganizationUnitTypeStore } from '../../../../../global/stores/organization-unit-type-store';
import { OrganizationUnitService } from '../../../../../global/services/organization-unit-service';
import { OrganizationUnit } from '../../../../../global/models/organization-unit';
import { IDesignation } from '../../../../models/designation';

@Component({
  selector: 'qfin-official-component',
  providers: [DatePipe],
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
    MatNativeDateModule,
  ],
  templateUrl: './official-component.html',
})
export class OfficialComponentDetail {
  empId = input<string>(EMPTY_UUID);
  onOfficialUpdate = output<void>();
  private dateAdapter = inject(DateAdapter<Date>);
  private readonly datePipe = inject(DatePipe);
  private readonly organizationUnitTypeStore = inject(OrganizationUnitTypeStore);
  private readonly employeeStore = inject(EmployeeStore);
  private readonly employeeService = inject(EmployeeService);
  private readonly organizationUnitService = inject(OrganizationUnitService);
  private readonly alertService = inject(AlertService);

  readonly iconMap = APP_ICONS_MAP;
  isEditMode = computed(() => !!this.empId() && this.empId() !== EMPTY_UUID);
  organizationUnits = signal<OrganizationUnit[]>([]);
  designations = signal<IDesignation[]>([]);
  protected readonly officialModel = signal<IEmployeeOfficialInfo>(new EmployeeOfficialInfo());

  protected readonly officialSchema: Schema<IEmployeeOfficialInfo> = schema((path) => {
    // required(path.officialEmail, { message: 'Official Email is required' });
    pattern(path.officialEmail, /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
      message: 'Enter a valid email address',
    });
    required(path.employementType, { message: 'Employement Type is required' });
    required(path.dateOfJoining, { message: 'Joining Date is required' });
    required(path.designationId, { message: 'Designation is required' });
    required(path.salaryGrade, { message: 'Salary Grade is required' });
    required(path.grossSalary, { message: 'Gross Salary is required' });
    required(path.organizationUnitTypeId, { message: 'Organization Unit Type is required' });
    required(path.organizationUnitId, { message: 'Organization Unit is required' });
    required(path.companyName, { message: 'Company Name is required' });
    readonly(path.dateOfJoining, { when: () => true });
    readonly(path.dateOfConfirmation, { when: () => true });
    readonly(path.separationDate, { when: () => true });
    readonly(path.companyName, { when: () => true });
    readonly(path.salaryGrade, { when: () => true });
    const isNotEditable = ({ valueOf }: any) => {
      return valueOf(path.isDesignationEditable) === false;
    };
    disabled(path.organizationUnitTypeId, { when: isNotEditable });
    disabled(path.organizationUnitId, { when: isNotEditable });
    disabled(path.designationId, { when: isNotEditable });
  });

  readonly organizationUnitTypes = this.organizationUnitTypeStore.organizationUnitTypes;
  protected readonly officialForm = form(this.officialModel, this.officialSchema);
  @ViewChild('stepper', { read: ElementRef })
  stepper!: ElementRef;
  constructor() {
    this.dateAdapter.setLocale('en-GB');
  }
  onOrganizationUnitTypeChange(typeId: string) {
    if (!typeId || typeId === EMPTY_UUID) {
      return;
    }

    this.organizationUnitService.getOrganizationUnitByType(typeId).subscribe({
      next: (res: any) => {
        this.organizationUnits.set(res);
      },
    });
  }

  onOrganizationUnitChange(id: string) {
    if (!id || id === EMPTY_UUID) {
      return;
    }

    const units = this.organizationUnits();
    const selectedUnit = units.find((x: any) => x.id === id);

    if (selectedUnit) {
      this.officialModel.update((state) => ({
        ...state,
        organizationUnitId: id,
        companyName: selectedUnit.companyName || '',
        companyId: selectedUnit.companyId || '',
      }));
    }
    this.employeeService.getDisignationByOrganizationUnit(id).subscribe({
      next: (res: any) => {
        this.designations.set(res);
      },
    });
  }
  onDesignationChange(id: string) {
    if (!id || id === EMPTY_UUID) {
      return;
    }

    const designations = this.designations();
    const selectedDesignation = designations.find((x: any) => x.id === id);

    if (selectedDesignation) {
      this.officialModel.update((state) => ({
        ...state,
        designationId: id,
        salaryGrade: selectedDesignation.salaryGrade || '',
        grossSalary: selectedDesignation.grossSalary || 0,
      }));
    }
  }
  private officialResource = rxResource({
    params: () => ({ id: this.empId(), editMode: this.isEditMode() }),
    stream: ({ params }) => {
      if (params.editMode && params.id !== EMPTY_UUID) {
        return this.employeeService.getOfficialData(params.id).pipe(
          tap((resp: any) => {
            this.employeeStore.setEmployeeComponentId(resp.id);
            this.officialModel.set(new EmployeeOfficialInfo(resp));

            this.officialModel.update((state) => ({
              ...state,
              dateOfJoining: resp.joiningDate == null ? null : new Date(resp.joiningDate),
              dateOfConfirmation:
                resp.confirmationDate == null ? null : new Date(resp.confirmationDate),
              separationDate: resp.separationDate == null ? null : new Date(resp.separationDate),
              isDesignationEditable: resp.isDesignationEditable,
            }));

            if (resp.organizationUnitTypeId) {
              this.organizationUnitService
                .getOrganizationUnitByType(resp.organizationUnitTypeId)
                .subscribe({
                  next: (res: any) => {
                    this.organizationUnits.set(res);
                  },
                });
            }

            if (resp.organizationUnitId) {
              this.employeeService
                .getDisignationByOrganizationUnit(resp.organizationUnitId)
                .subscribe({
                  next: (res: any) => {
                    this.designations.set(res);
                    this.officialModel.update((state) => ({
                      ...state,
                      designationId: resp.designationId
                        ? resp.designationId.toLowerCase()
                        : state.designationId,
                    }));
                  },
                });
            }
          }),
        );
      } else {
        this.officialModel.set(new EmployeeOfficialInfo());
        return of(null);
      }
    },
  });

  onSubmit() {
    this.officialForm().markAsTouched();
    if (!this.officialForm().valid()) {
      return;
    }

    const data = this.officialForm().value();
    const dataToSave: any = this.officialForm().value();
    dataToSave.companyId = dataToSave.companyId == '' ? null : dataToSave.companyId;
    dataToSave.organizationUnitId =
      dataToSave.organizationUnitId == '' ? null : dataToSave.organizationUnitId;
    dataToSave.departmentId = dataToSave.departmentId == '' ? null : dataToSave.departmentId;
    dataToSave.employementType =
      dataToSave.employementType == '' ? null : dataToSave.employementType;
    dataToSave.dateOfJoining =
      dataToSave.dateOfJoining == ''
        ? null
        : this.datePipe.transform(dataToSave.dateOfJoining, 'yyyy-MM-dd');
    dataToSave.dateOfConfirmation =
      dataToSave.dateOfConfirmation == ''
        ? null
        : this.datePipe.transform(dataToSave.dateOfConfirmation, 'yyyy-MM-dd');
    dataToSave.separationDate =
      dataToSave.separationDate == ''
        ? null
        : this.datePipe.transform(dataToSave.separationDate, 'yyyy-MM-dd');
    dataToSave.referedBy = dataToSave.referedBy == '' ? null : dataToSave.referedBy;
    dataToSave.howYouKnow = dataToSave.howYouKnow == '' ? null : dataToSave.howYouKnow;
    dataToSave.officialEmail = dataToSave.officialEmail == '' ? null : dataToSave.officialEmail;
    dataToSave.isActive = dataToSave.isActive == '' ? false : dataToSave.isActive;
    dataToSave.companyName = dataToSave.companyName == '' ? null : dataToSave.companyName;
    dataToSave.designationId = dataToSave.designationId == '' ? null : dataToSave.designationId;
    dataToSave.salaryGrade = dataToSave.salaryGrade == '' ? null : dataToSave.salaryGrade;

    delete dataToSave.joiningDate;
    delete dataToSave.confirmationDate;
    if (this.isEditMode()) {
      this.employeeService.updateOfficialInfo(this.empId(), dataToSave).subscribe({
        next: (resp: any) => {
          this.alertService.success('Success', resp).then(() => {
            this.employeeStore.refreshList();
            this.employeeStore.refreshDetail();
            this.onOfficialUpdate.emit();
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
