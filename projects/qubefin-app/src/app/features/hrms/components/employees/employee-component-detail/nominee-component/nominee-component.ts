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
  isEditMode = computed(() => !!this.empId() && this.empId() !== EMPTY_UUID);
  readonly relations = computed(() => {
    const list = this.attendRegularizationsStore.utilities();
    return list.length > 0 ? list.filter((m) => m.sysKey === 'RELATION') : [];
  });
  protected readonly nomineeModel = signal<IEmployeeNominee>(new EmployeeNominee());
  protected readonly nomineeSchema: Schema<IEmployeeNominee> = schema((path) => {
    required(path.name, { message: 'Name is required' });
    readonly(path.dateOfBirth, { when: () => true });
    pattern(path.aadhaarNumber, /^[2-9][0-9]{11}$/, { message: 'Invalid Aadhaar number' });
    pattern(path.voterIdNumber, /^[A-Z]{3}[0-9]{7}$/, { message: 'Invalid Voter Id number' });
  });
  protected readonly nomineeForm = form(this.nomineeModel, this.nomineeSchema);
  @ViewChild('stepper', { read: ElementRef })
  stepper!: ElementRef;
  constructor() {
    this.dateAdapter.setLocale('en-GB');
  }
  private nomineeResource = rxResource({
    params: () => ({ id: this.empId(), editMode: this.isEditMode() }),
    stream: ({ params }) => {
      if (params.editMode && params.id !== EMPTY_UUID) {
        return this.employeeService.getNomineeData(params.id).pipe(
          tap((resp: any) => {
            this.employeeStore.setEmployeeComponentId(resp.id);
            this.nomineeModel.set(new EmployeeNominee(resp));
            this.nomineeModel.update((state) => ({
              ...state,
            }));
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
    const data = this.nomineeForm().value();
    if (this.isEditMode()) {
      this.employeeService.updateNomineeInfo(this.empId(), data).subscribe({
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
