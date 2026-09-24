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
import { EmployeeService } from '../../../../../services/employee-service';
import { rxResource } from '@angular/core/rxjs-interop';
import { of, tap } from 'rxjs';
import { APP_ICONS_MAP } from '../../../../../../../lucide-icons';
import { EmployeeQualification, IEmployeeQualification } from '../../../../../models/employee-detail';

interface QualificationFormModel {
  qualifications: IEmployeeQualification[];
}

@Component({
  selector: 'qfin-joining-qualification-component',
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
export class JoiningQualificationComponent {
  employeeId = input<string>(EMPTY_UUID);

  onQualifyUpdate = output<void>();

  isEditMode = computed(() => !!this.employeeId() && this.employeeId() !== EMPTY_UUID);

  private readonly employeeService = inject(EmployeeService);
  private readonly alertService = inject(AlertService);
  readonly iconMap = APP_ICONS_MAP;

  protected readonly qualificationModel = signal<QualificationFormModel>({
    qualifications: [],
  });

  protected readonly qualificationschema = schema<QualificationFormModel>((path) => {
    required(path.qualifications);

    applyEach(path.qualifications, (refPath) => {
      required(refPath.academicStream, { message: 'Academic Stream is required' });
      required(refPath.specialization, { message: 'Specialization is required' });
      required(refPath.yearOfPassing, { message: 'Year of Passing is required' });
      required(refPath.universityOrBoard, { message: 'University/Board is required' });
      required(refPath.schoolOrCollege, { message: 'School/College is required' });
      required(refPath.gradeOrMarks, { message: 'Grade/Marks is required' });
    });
  });

  protected readonly qualificationForm = form(this.qualificationModel, this.qualificationschema);

  constructor() {
    effect(() => {
      if (this.qualificationModel().qualifications.length === 0) {
        const model = new EmployeeQualification();
        model.id = EMPTY_UUID;
        model.employeeId = this.employeeId();
        model.isLatestQualification = true;

        this.qualificationModel.set({ qualifications: [model] });
      }
    });
  }

  addQualification() {
    const model = new EmployeeQualification();
    model.employeeId = this.employeeId();
    this.qualificationModel.update((state) => ({
      qualifications: [...state.qualifications, model],
    }));
  }

  removeQualification(index: number) {
    this.qualificationModel.update((state) => ({
      qualifications: state.qualifications.filter((_, i) => i !== index),
    }));
  }

  onIsLatestQualificationChange(index: number, checked: boolean) {
    this.qualificationModel.update((state) => ({
      qualifications: state.qualifications.map((q, i) => {
        if (i === index) {
          return { ...q, isLatestQualification: checked };
        }
        return checked ? { ...q, isLatestQualification: false } : q;
      }),
    }));
  }

  hasNoLatestQualificationSelected(): boolean {
    return !this.qualificationModel().qualifications.some((q) => q.isLatestQualification);
  }

  onSubmit() {
    this.qualificationForm().markAsTouched();

    if (this.hasNoLatestQualificationSelected()) {
      this.alertService.warning(
        null,
        'Please mark exactly one qualification as the latest qualification.',
      );
      return;
    }

    if (!this.qualificationForm().valid()) {
      return;
    }
    const dataToSave = [...this.qualificationForm().value().qualifications];
    this.employeeService.updateQualificationsInfo(this.employeeId(), dataToSave).subscribe({
      next: (resp: any) => {
        this.alertService.success('Success', resp).then(() => {
          this.onQualifyUpdate.emit();
        });
      },
      error: (err: any) => {},
    });
  }

  private qualificationResource = rxResource({
    params: () => ({ id: this.employeeId(), editMode: this.isEditMode() }),
    stream: ({ params }) => {
      if (params.editMode && params.id !== EMPTY_UUID) {
        return this.employeeService.getQualificationData(params.id).pipe(
          tap((resp: any) => {
            this.qualificationModel.update((state) => ({
              qualifications: (resp ?? []).map(
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
        return of(null);
      }
    },
  });
}
