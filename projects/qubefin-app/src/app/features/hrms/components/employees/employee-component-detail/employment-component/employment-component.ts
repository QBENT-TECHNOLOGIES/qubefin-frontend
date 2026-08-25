import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import { applyEach, form, FormField, readonly, required, schema } from '@angular/forms/signals';
import { LucideDynamicIcon } from '@lucide/angular';
import { MatStepperModule } from '@angular/material/stepper';
import { EmployeeService } from '../../../../services/employee-service';
import { rxResource } from '@angular/core/rxjs-interop';
import { of, tap } from 'rxjs';
import { APP_ICONS_MAP } from '../../../../../../lucide-icons';
import { EmployeeStore } from '../../../../stores/employee-store';
import { EmployeeEmployment, IEmployeeEmployment } from '../../../../models/employee-detail';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, MatNativeDateModule } from '@angular/material/core';

interface EmploymentFormModel {
  employments: EmployeeEmployment[];
}

@Component({
  selector: 'qfin-employment-component',
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
  templateUrl: './employment-component.html',
})
export class EmploymentComponentDetail {
  empId = input<string>(EMPTY_UUID);

  onEmpUpdate = output<void>();

  isEditMode = computed(() => !!this.empId() && this.empId() !== EMPTY_UUID);

  private readonly datePipe = inject(DatePipe);
  private readonly employeeStore = inject(EmployeeStore);
  private readonly employeeService = inject(EmployeeService);
  private readonly alertService = inject(AlertService);
  readonly iconMap = APP_ICONS_MAP;

  protected readonly employmentModel = signal<EmploymentFormModel>({
    employments: [],
  });

  protected readonly employmentschema = schema<EmploymentFormModel>((path) => {
    required(path.employments);

    applyEach(path.employments, (refPath) => {
      required(refPath.employerName);
      required(refPath.designation);
      required(refPath.fromDate);
      required(refPath.toDate);
      required(refPath.lastDrawnSalary);
      readonly(refPath.fromDate, { when: () => true });
      readonly(refPath.toDate, { when: () => true });
    });
  });

  protected readonly employmentForm = form(this.employmentModel, this.employmentschema);

  private dateAdapter = inject(DateAdapter<Date>);
  constructor() {
    this.dateAdapter.setLocale('en-GB');
    effect(() => {
      if (this.employmentModel().employments.length === 0) {
        const model = new EmployeeEmployment();
        model.id = EMPTY_UUID;
        model.employeeId = this.empId();

        this.employmentModel.set({ employments: [model] });
      }
    });
  }

  addEmployment() {
    const model = new EmployeeEmployment();
    model.employeeId = this.empId();
    this.employmentModel.update((state) => ({
      employments: [...state.employments, model],
    }));
  }

  removeEmployment(index: number) {
    this.employmentModel.update((state) => ({
      employments: state.employments.filter((_, i) => i !== index),
    }));
  }

  onSubmit() {
    if (!this.employmentForm().valid()) {
      return;
    }
    const dataToSave = this.employmentForm()
      .value()
      .employments.map((emp: any) => ({
        ...emp,
        fromDate: emp.fromDate ? this.datePipe.transform(emp.fromDate, 'yyyy-MM-dd') : null,
        toDate: emp.toDate ? this.datePipe.transform(emp.toDate, 'yyyy-MM-dd') : null,
      }));
    this.employeeService.updateEmploymentInfo(this.empId(), dataToSave).subscribe({
      next: (resp: any) => {
        this.alertService.success('Success', resp).then(() => {
          this.employeeStore.refreshList();
          this.employeeStore.refreshDetail();
          this.onEmpUpdate.emit();
        });
      },
      error: (err: any) => {},
    });
  }

  private employmentResource = rxResource({
    params: () => ({ id: this.empId(), editMode: this.isEditMode() }),
    stream: ({ params }) => {
      if (params.editMode && params.id !== EMPTY_UUID) {
        return this.employeeService.getEmploymentData(params.id).pipe(
          tap((resp: any) => {
            this.employmentModel.update((state) => ({
              employments: (resp || []).map(
                (doc: IEmployeeEmployment) =>
                  new EmployeeEmployment({
                    ...doc,
                    fromDate: doc.fromDate ? new Date(doc.fromDate) : undefined,
                    toDate: doc.toDate ? new Date(doc.toDate) : undefined,
                  }),
              ),
            }));
          }),
        );
      } else {
        this.employmentModel.set({
          employments: [],
        });
        return of(null);
      }
    },
  });
}
