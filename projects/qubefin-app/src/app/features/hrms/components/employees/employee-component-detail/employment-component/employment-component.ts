import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { AlertService, DocumentModalService, EMPTY_UUID } from 'qubefin-core';
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
type EmploymentDocField = 'expCert' | 'noc';

const ALLOWED_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
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
  readonly documentModal = inject(DocumentModalService);
  readonly iconMap = APP_ICONS_MAP;

  protected readonly employmentModel = signal<EmploymentFormModel>({
    employments: [],
  });

  protected readonly employmentschema = schema<EmploymentFormModel>((path) => {
    required(path.employments);

    applyEach(path.employments, (refPath) => {
      required(refPath.employerName, { message: 'Employer Name is required' });
      required(refPath.designation, { message: 'Designation is required' });
      required(refPath.fromDate);
      required(refPath.toDate);
      required(refPath.lastDrawnSalary, { message: 'Last Drawn Salary required' });
      required(refPath.nocFileName, { message: 'NOC File Name is required' });
      required(refPath.expCertFileName, { message: 'Expense Cert File Name is required' });
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
  onFileSelected(event: Event, index: number, field: EmploymentDocField) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!ALLOWED_DOC_TYPES.includes(file.type)) {
      input.value = '';
      this.alertService.warning(null, 'Only image/PDF file can be selected.');
      return;
    }

    this.employmentModel.update((state) => {
      const employments = [...state.employments];
      const current = employments[index] as any;
      const updated = { ...current, [`${field}FileName`]: file.name };
      updated[`${field}RawFile`] = file;
      employments[index] = updated;
      return { employments };
    });
  }

  removeFile(index: number, field: EmploymentDocField) {
    this.employmentModel.update((state) => {
      const employments = [...state.employments];
      const current = employments[index] as any;
      const updated = { ...current, [`${field}FileName`]: '' };
      updated[`${field}RawFile`] = null;
      updated[`${field}FileUrl`] = '';
      employments[index] = updated;
      return { employments };
    });
  }

  openDocument(index: number, field: EmploymentDocField) {
    const emp = this.employmentModel().employments[index] as any;
    if (!emp) return;

    const rawFile = emp[`${field}RawFile`];
    const fileUrl = emp[`${field}FileUrl`];
    const fileName =
      emp[`${field}FileName`] || (field === 'expCert' ? 'Experience Certificate' : 'NOC');

    let url = '';
    if (rawFile) {
      url = URL.createObjectURL(rawFile);
    } else if (fileUrl) {
      url = fileUrl;
    }

    if (!url) {
      this.alertService.warning('Oops!', 'Document preview is not available.');
      return;
    }

    this.documentModal.open({
      url,
      documentName: fileName,
      extension: fileName.split('.').pop()?.toLowerCase() || '',
      downloadAccess: true,
    });
  }
  onSubmit() {
    this.employmentForm().markAsTouched();
    if (!this.employmentForm().valid()) {
      return;
    }

    const employments = this.employmentForm().value().employments;
    const formData = new FormData();

    employments.forEach((emp: any, index: number) => {
      formData.append(`employments[${index}].id`, emp.id || '');
      formData.append(`employments[${index}].employerName`, emp.employerName || '');
      formData.append(`employments[${index}].designation`, emp.designation || '');
      formData.append(`employments[${index}].jobTitle`, emp.jobTitle || '');
      formData.append(`employments[${index}].lastDrawnSalary`, String(emp.lastDrawnSalary ?? ''));

      if (emp.fromDate) {
        formData.append(
          `employments[${index}].fromDate`,
          this.datePipe.transform(emp.fromDate, 'yyyy-MM-dd') || '',
        );
      }
      if (emp.toDate) {
        formData.append(
          `employments[${index}].toDate`,
          this.datePipe.transform(emp.toDate, 'yyyy-MM-dd') || '',
        );
      }

      if (emp.expCertFileName) {
        formData.append(`employments[${index}].expCertFileName`, emp.expCertFileName);
      }
      if (emp.expCertRawFile) {
        formData.append(`employments[${index}].expCertFile`, emp.expCertRawFile);
      }

      if (emp.nocFileName) {
        formData.append(`employments[${index}].nocFileName`, emp.nocFileName);
      }
      if (emp.nocRawFile) {
        formData.append(`employments[${index}].nocFile`, emp.nocRawFile);
      }
    });

    this.employeeService.updateEmploymentInfo(this.empId(), formData).subscribe({
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
