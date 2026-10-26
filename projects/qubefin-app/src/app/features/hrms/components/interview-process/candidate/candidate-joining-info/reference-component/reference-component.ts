import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import { applyEach, form, FormField, pattern, required, schema } from '@angular/forms/signals';
import { LucideDynamicIcon } from '@lucide/angular';
import { MatStepperModule } from '@angular/material/stepper';
import { EmployeeService } from '../../../../../services/employee-service';
import { rxResource } from '@angular/core/rxjs-interop';
import { of, tap } from 'rxjs';
import {
  EmployeeReference,
  IEmployeeReference,
  IEmployeeReferralInfo,
} from '../../../../../models/employee-detail';
import { APP_ICONS_MAP } from '../../../../../../../lucide-icons';
import { AttendanceRegularizationsStore } from '../../../../../stores/attendance-regularizations-store';

interface ReferenceFormModel {
  references: IEmployeeReference[];
}

@Component({
  selector: 'qfin-joining-reference-component',
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
  templateUrl: './reference-component.html',
})
export class JoiningReferenceComponent {
  employeeId = input<string>(EMPTY_UUID);

  onRefUpdate = output<void>();

  private readonly employeeService = inject(EmployeeService);
  private readonly alertService = inject(AlertService);
  readonly iconMap = APP_ICONS_MAP;
  isEditMode = computed(() => !!this.employeeId() && this.employeeId() !== EMPTY_UUID);

  protected readonly referenceModel = signal<ReferenceFormModel>({
    references: [],
  });

  protected readonly referenceSchema = schema<ReferenceFormModel>((path) => {
    required(path.references);

    applyEach(path.references, (refPath) => {
      required(refPath.personName, { message: 'Person Name is required' });
      required(refPath.mobile, { message: 'Mobile No. is required' });
      pattern(refPath.mobile, /^[6-9]\d{9}$/, { message: 'Invalid mobile number' });
      pattern(refPath.email, /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
        message: 'Invalid email',
      });
    });
  });

  protected readonly referenceForm = form(this.referenceModel, this.referenceSchema);

  constructor() {
    effect(() => {
      if (this.referenceModel().references.length === 0) {
        const model = new EmployeeReference();
        model.id = EMPTY_UUID;
        model.employeeId = this.employeeId();

        this.referenceModel.set({ references: [model] });
      }
    });
  }

  addReference() {
    const model = new EmployeeReference();
    model.employeeId = this.employeeId();
    this.referenceModel.update((state) => ({
      references: [...state.references, model],
    }));
  }

  removeReference(index: number) {
    this.referenceModel.update((state) => ({
      references: state.references.filter((_, i) => i !== index),
    }));
  }

  onSubmit() {
    this.referenceForm().markAsTouched();
    if (!this.referenceForm().valid()) {
      return;
    }
    const dataToSave = [...this.referenceForm().value().references].map((ref) => {
      const cleanedRef = { ...ref };

      (Object.keys(cleanedRef) as Array<keyof typeof cleanedRef>).forEach((key) => {
        if (cleanedRef[key] === '') {
          cleanedRef[key] = null as any;
        }
      });

      return cleanedRef;
    });
    this.employeeService.updateReferenceInfo(this.employeeId(), dataToSave).subscribe({
      next: (resp: any) => {
        this.alertService.success('Success', resp).then(() => {
          this.onRefUpdate.emit();
        });
      },
      error: (err: any) => {},
    });
  }

  private referenceResource = rxResource({
    params: () => ({ id: this.employeeId(), editMode: this.isEditMode() }),
    stream: ({ params }) => {
      if (params.editMode && params.id !== EMPTY_UUID) {
        return this.employeeService.getReferenceData(params.id).pipe(
          tap((resp: any) => {
            this.referenceModel.update((state) => ({
              references: (resp || []).map(
                (doc: IEmployeeReference) =>
                  new EmployeeReference({
                    ...doc,
                  }),
              ),
            }));
          }),
        );
      } else {
        this.referenceModel.set({
          references: [],
        });
        return of(null);
      }
    },
  });
}
