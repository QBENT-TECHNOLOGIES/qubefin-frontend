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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, MatNativeDateModule } from '@angular/material/core';
import { EmployeeNominee, IEmployeeNominee } from '../../../../models/employee-detail';
import { rxResource } from '@angular/core/rxjs-interop';
import { of, tap } from 'rxjs';
import { AttendanceRegularizationsStore } from '../../../../stores/attendance-regularizations-store';
import { AdministrativeUnitStore } from '../../../../../global/stores/administrative-unit-store';
import { AdministrativeUnitTreeNode } from '../../../../../global/models/administrative-unit-tree-node';
// TODO: confirm these two paths match where administrative-unit-store / administrative-unit-tree-node
// actually live in your repo. They're assumed to sit next to employee-store / employee-detail
// (same depth as the imports above) since administrative-unit-cascade.ts uses the same files.

@Component({
  selector: 'qfin-nominee-component',
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
  templateUrl: './nominee-component.html',
  styles: ``,
})
export class NomineeComponentDetail {
  empId = input<string>(EMPTY_UUID);
  onNomineeUpdate = output<void>();
  private dateAdapter = inject(DateAdapter<Date>);
  private readonly datePipe = inject(DatePipe);
  private readonly attendRegularizationsStore = inject(AttendanceRegularizationsStore);
  private readonly employeeStore = inject(EmployeeStore);
  private readonly employeeService = inject(EmployeeService);
  private readonly alertService = inject(AlertService);
  private readonly administrativeUnitStore = inject(AdministrativeUnitStore);
  isEditMode = computed(() => !!this.empId() && this.empId() !== EMPTY_UUID);
  readonly relations = computed(() => {
    const list = this.attendRegularizationsStore.utilities();
    return list.length > 0 ? list.filter((m) => m.sysKey === 'RELATION') : [];
  });

  private readonly administrativeUnitTree = this.administrativeUnitStore.administrativeUnitTree;
  readonly stateList = signal<AdministrativeUnitTreeNode[]>([]);
  readonly districtList = signal<AdministrativeUnitTreeNode[]>([]);
  readonly selectedState = signal<string | null>(null);
  readonly selectedDistrict = signal<string | null>(null);
  private lastRestoredDistrictId: string | null = null;
  protected readonly nomineeModel = signal<IEmployeeNominee>(new EmployeeNominee());
  protected readonly nomineeSchema: Schema<IEmployeeNominee> = schema((path) => {
    required(path.name, { message: 'Name is required' });
    readonly(path.dateOfBirth, { when: () => true });
    readonly(path.age, { when: () => true });
    pattern(path.aadharNumber, /^[2-9][0-9]{11}$/, { message: 'Invalid Aadhaar number' });
    // pattern(path.voterIdNumber, /^[A-Z]{3}[0-9]{7}$/, { message: 'Invalid Voter Id number' });
  });
  protected readonly nomineeForm = form(this.nomineeModel, this.nomineeSchema);
  @ViewChild('stepper', { read: ElementRef })
  stepper!: ElementRef;
  constructor() {
    this.dateAdapter.setLocale('en-GB');
    effect(() => {
      const dobValue = this.nomineeForm.dateOfBirth().value();
      if (dobValue) {
        const dob = new Date(dobValue);
        const today = new Date();
        let calculatedAge = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
          calculatedAge--;
        }
        this.nomineeForm.age().value.set(calculatedAge);
      } else {
        this.nomineeForm.age().value.set(null);
      }
    });
    effect(() => {
      const tree = this.administrativeUnitTree();
      if (!tree.length) {
        return;
      }

      this.stateList.set(tree[0]?.children ?? []);

      const districtId = this.nomineeModel().districtId;
      if (!districtId || districtId === this.lastRestoredDistrictId) {
        return;
      }

      if (this.restoreLocation(tree, districtId)) {
        this.lastRestoredDistrictId = districtId;
      }
    });
  }

  private restoreLocation(tree: AdministrativeUnitTreeNode[], districtId: string): boolean {
    for (const country of tree) {
      for (const state of country.children ?? []) {
        const district = (state.children ?? []).find((d) => d.id === districtId);
        if (district) {
          this.selectedState.set(state.id);
          this.districtList.set(state.children ?? []);
          this.selectedDistrict.set(district.id);
          return true;
        }
      }
    }
    return false;
  }

  onStateChange(id: string): void {
    this.selectedState.set(id);
    this.selectedDistrict.set(null);

    this.nomineeForm.stateId().value.set(id);
    this.nomineeForm.districtId().value.set('');

    const state = this.stateList().find((x) => x.id === id);
    this.districtList.set(state?.children ?? []);
  }

  onDistrictChange(id: string): void {
    this.selectedDistrict.set(id);
    this.nomineeForm.districtId().value.set(id);
  }
  private nomineeResource = rxResource({
    params: () => ({ id: this.empId(), editMode: this.isEditMode() }),
    stream: ({ params }) => {
      if (params.editMode && params.id !== EMPTY_UUID) {
        return this.employeeService.getNomineeData(params.id).pipe(
          tap((resp: any) => {
            const data = Array.isArray(resp) && resp.length > 0 ? resp[0] : null;

            if (data) {
              this.employeeStore.setEmployeeComponentId(data.employeeId);

              this.nomineeModel.set(
                new EmployeeNominee({
                  name: data.nomineeName,
                  relationWithInsuredPerson: data.relationWithInsuredPerson,
                  dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
                  age: data.age,
                  uhidAbhaNumber: data.uhidAbhaNumber,
                  abhaAddress: data.abhaAddress,
                  uan: data.uan,
                  aadharNumber: data.aadharNumber,
                  voterIdNumber: data.voterIdnumber,
                  isResidingWithIp: data.isResidingWithIp,
                  stateId: data.stateId,
                  districtId: data.districtId,
                }),
              );
            }
          }),
        );
      } else {
        this.nomineeModel.set(new EmployeeNominee());
        return of(null);
      }
    },
  });

  onSubmit() {
    this.nomineeForm().markAsTouched();
    if (!this.nomineeForm().valid()) {
      return;
    }
    const formValue = this.nomineeForm().value();
    const nomineeObject = {
      nomineeName: formValue.name || null,
      relationWithInsuredPerson: formValue.relationWithInsuredPerson || null,
      dateOfBirth: formValue.dateOfBirth
        ? this.datePipe.transform(formValue.dateOfBirth, 'yyyy-MM-dd')
        : null,
      age: formValue.age,
      uhidAbhaNumber: formValue.uhidAbhaNumber || null,
      abhaAddress: formValue.abhaAddress || null,
      uan: formValue.uan || null,
      aadharNumber: formValue.aadharNumber || null,
      voterIdnumber: formValue.voterIdNumber || null,
      isResidingWithIp: formValue.isResidingWithIp,
      stateId: formValue.stateId || null,
      districtId: formValue.districtId || null,
    };

    const dataToSave = [nomineeObject];
    if (this.isEditMode()) {
      this.employeeService.updateNomineeInfo(this.empId(), dataToSave).subscribe({
        next: (resp: any) => {
          this.alertService.success('Success', resp).then(() => {
            this.employeeStore.refreshList();
            this.employeeStore.refreshDetail();
            this.onNomineeUpdate.emit();
          });
        },
        error: (err: any) => {},
      });
    }
  }
}
