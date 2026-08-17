import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import { applyEach, form, FormField, required, schema } from '@angular/forms/signals';
import { LucideDynamicIcon } from '@lucide/angular';
import { MatStepperModule } from '@angular/material/stepper';
import { EmployeeService } from '../../../../services/employee-service';
import { rxResource } from '@angular/core/rxjs-interop';
import { of, tap } from 'rxjs';
import { APP_ICONS_MAP } from '../../../../../../lucide-icons';
import { EmployeeStore } from '../../../../stores/employee-store';
import Swal from 'sweetalert2';
import { EmployeeQualification, IEmployeeQualification } from '../../../../models/employee-detail';

interface QualificationFormModel {
  qualifications: IEmployeeQualification[];
}

@Component({
  selector: 'qfin-qualification-component',
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
  ],
  templateUrl: './qualification-component.html',
})
export class QualificationComponentDetail {
  empId = input<string>(EMPTY_UUID);

  onQualifyUpdate = output<void>();

  isEditMode = computed(() => !!this.empId() && this.empId() !== EMPTY_UUID);

  private readonly employeeStore = inject(EmployeeStore);
  private readonly employeeService = inject(EmployeeService);
  private readonly alertService = inject(AlertService);
  readonly iconMap = APP_ICONS_MAP;

  protected readonly qualificationModel = signal<QualificationFormModel>({
    qualifications: [],
  });

  // 2. Refactor your schema block using applyEach
  protected readonly qualificationschema = schema<QualificationFormModel>((path) => {
    // Ensures the array itself is present
    required(path.qualifications);

    // Iterates cleanly through each item in the array with correct type safety
    applyEach(path.qualifications, (refPath) => {
      required(refPath.academicStream);
      // required(refPath.specialization);
      required(refPath.yearOfPassing);
      required(refPath.universityOrBoard);
      required(refPath.schoolOrCollege);
      required(refPath.gradeOrMarks);
    });
  });

  protected readonly qualificationForm = form(this.qualificationModel, this.qualificationschema);

  constructor() {
    effect(() => {
      if (this.qualificationModel().qualifications.length === 0) {
        // this.addQualification();
        const model = new EmployeeQualification();
        model.id = EMPTY_UUID;
        model.employeeId = this.empId();

        this.qualificationModel.set({ qualifications: [model] });
      }
    });
  }

  addQualification() {
    const model = new EmployeeQualification();
    model.employeeId = this.empId();
    this.qualificationModel.update((state) => ({
      qualifications: [...state.qualifications, model],
    }));
  }

  removeQualification(index: number) {
    this.qualificationModel.update((state) => ({
      qualifications: state.qualifications.filter((_, i) => i !== index),
    }));
  }

  onSubmit() {
    if (!this.qualificationForm().valid()) {
      return;
    }
    const dataToSave = [...this.qualificationForm().value().qualifications];
    this.employeeService.updateQualificationsInfo(this.empId(), dataToSave).subscribe({
      next: (resp: any) => {
        this.alertService.success('Success', resp).then(() => {
          this.employeeStore.refreshList();
          this.employeeStore.refreshDetail();
          this.onQualifyUpdate.emit();
        });
      },
      error: (err: any) => {},
    });
  }

  private kycResource = rxResource({
    params: () => ({ id: this.empId(), editMode: this.isEditMode() }),
    stream: ({ params }) => {
      if (params.editMode && params.id !== EMPTY_UUID) {
        return this.employeeService.getQualificationData(params.id).pipe(
          tap((resp: any) => {
            this.qualificationModel.update((state) => ({
              qualifications: (resp.qualifications ?? []).map(
                (doc: IEmployeeQualification) =>
                  new EmployeeQualification({
                    ...doc,
                  }),
              ),
            }));
          }),
        );
      } else {
        this.qualificationModel.set({
          qualifications: [],
        });
        return of(null); // Safely stream an empty observable
      }
    },
  });
}
