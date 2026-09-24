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
import { AlertService, DocumentModalService, EMPTY_UUID, nationalities } from 'qubefin-core';
import {
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
import {
  EmployeePersonalInfo,
  IEmployeePersonalInfo,
  Utility,
} from '../../../../models/employee-detail';
import { rxResource } from '@angular/core/rxjs-interop';
import { of, tap } from 'rxjs';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';

@Component({
  selector: 'qfin-personal-component',
  providers: [provideNativeDateAdapter(), DatePipe],
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
  templateUrl: './personal-component.html',
})
export class PersonalComponentDetail {
  empId = input<string>(EMPTY_UUID);
  utilities = input<Utility[]>([]);
  activeIndex = input<number>(0);
  onSave = output<string>();
  onUpdate = output<void>();

  private dateAdapter = inject(DateAdapter<Date>);
  readonly maxDate = new Date();
  readonly nationalities = nationalities;
  private readonly datePipe = inject(DatePipe);
  private readonly employeeStore = inject(EmployeeStore);
  private readonly employeeService = inject(EmployeeService);
  private readonly alertService = inject(AlertService);
  readonly documentModal = inject(DocumentModalService);
  readonly iconMap = APP_ICONS_MAP;
  isEditMode = computed(() => !!this.empId() && this.empId() !== EMPTY_UUID);

  protected readonly employeeModel = signal<IEmployeePersonalInfo>(new EmployeePersonalInfo());

  protected readonly employeeSchema: Schema<IEmployeePersonalInfo> = schema((path) => {
    required(path.code, { message: 'Code is required' });
    required(path.firstName, { message: 'First name is required' });
    required(path.nationality, { message: 'Nationality is required' });
    required(path.lastName, { message: 'Last name is required' });
    required(path.dateOfBirth, { message: 'Date of birth is required' });
    required(path.gender, { message: 'Gender is required' });
    readonly(path.age, { when: () => true });
    readonly(path.dateOfBirth, { when: () => true });
  });

  protected readonly employeeForm = form(this.employeeModel, this.employeeSchema);

  protected readonly photoFileName = signal<string>('');
  protected readonly photoFileUrl = signal<string>('');
  protected readonly photoFile = signal<File | null>(null);

  @ViewChild('stepper', { read: ElementRef })
  stepper!: ElementRef;
  protected readonly bloodGroups = computed(() => this.filterUtility('BLOODGROUP'));
  protected readonly maritalStatuses = computed(() => this.filterUtility('MARITALSTATUS'));
  protected readonly genders = computed(() => this.filterUtility('GENDER'));
  protected readonly castes = computed(() => this.filterUtility('CASTE'));
  protected readonly religions = computed(() => this.filterUtility('RELIGION'));
  protected readonly salutations = computed(() => this.filterUtility('SALUTAION')); // Kept matching typo from original code
  protected readonly disabilityTypes = ['Yes', 'No'];
  private filterUtility(sysKey: string) {
    const list = this.utilities();
    return list.length > 0 ? list.filter((m: any) => m.sysKey === sysKey) : [];
  }

  private personalDataResource = rxResource({
    params: () => ({ id: this.empId() }),
    stream: ({ params }) => {
      if (params.id && params.id !== EMPTY_UUID) {
        this.employeeStore.setEmployeeComponentId(params.id);

        return this.employeeService.getPresonalData(params.id).pipe(
          tap((resp: any) => {
            if (resp && typeof resp.bloodGroup === 'string') {
              resp.bloodGroup = resp.bloodGroup.trim();
            }
            this.employeeModel.set(new EmployeePersonalInfo(resp));
          }),
        );
      } else {
        this.employeeModel.set(new EmployeePersonalInfo());
        return of(null);
      }
    },
  });
  constructor() {
    this.dateAdapter.setLocale('en-GB');
    effect(() => {
      const dobValue = this.employeeForm.dateOfBirth().value();
      if (dobValue) {
        const dob = new Date(dobValue);
        const today = new Date();
        let calculatedAge = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
          calculatedAge--;
        }
        this.employeeForm.age().value.set(calculatedAge);
      } else {
        this.employeeForm.age().value.set(null);
      }
    });
  }
  loadBloodGroups() {
    return this.utilities().length > 0
      ? this.utilities().filter((m: any) => m.sysKey == 'BLOODGROUP')
      : [];
  }

  loadMaritalStatus() {
    return this.utilities().length > 0
      ? this.utilities().filter((m: any) => m.sysKey == 'MARITALSTATUS')
      : [];
  }

  loadGender() {
    return this.utilities().length > 0
      ? this.utilities().filter((m: any) => m.sysKey == 'GENDER')
      : [];
  }
  loadCast() {
    return this.utilities().length > 0
      ? this.utilities().filter((m: any) => m.sysKey == 'CASTE')
      : [];
  }
  loadReligion() {
    return this.utilities().length > 0
      ? this.utilities().filter((m: any) => m.sysKey == 'RELIGION')
      : [];
  }
  loadSalutation() {
    return this.utilities().length > 0
      ? this.utilities().filter((m: any) => m.sysKey == 'SALUTAION')
      : [];
  }
  onFileSelect(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    const file = inputElement.files?.[0];
    if (file) {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        inputElement.value = '';
        this.alertService.warning(null, 'Only image file can be selected.');
        return;
      }
      this.photoFile.set(file);
      this.photoFileUrl.set(URL.createObjectURL(file));
      this.photoFileName.set(file.name);
    }
  }
  openFile() {
    if (!this.photoFileUrl() || !this.photoFileName()) {
      return;
    }
    this.documentModal.open({
      url: this.photoFileUrl(),
      documentName: this.photoFileName(),
      extension: this.photoFileName().split('.').pop()?.toLowerCase() || '',
      downloadAccess: true,
    });
  }
  removeFile() {
    this.photoFile.set(null);
    if (this.photoFileUrl().startsWith('blob:')) {
      URL.revokeObjectURL(this.photoFileUrl());
    }
    this.photoFileUrl.set('');
    this.photoFileName.set('');
  }
  onSubmit() {
    this.employeeForm().markAsTouched();
    if (!this.employeeForm().valid()) {
      return;
    }
    const formValue = this.employeeForm().value();

    const formData = new FormData();

    formData.append('code', formValue.code ?? '');
    formData.append('salutation', formValue.salutation ?? '');
    formData.append('firstName', formValue.firstName ?? '');
    formData.append('middleName', formValue.middleName ?? '');
    formData.append('lastName', formValue.lastName ?? '');
    formData.append('gender', formValue.gender ?? '');
    formData.append('fatherName', formValue.fatherName ?? '');
    formData.append('motherName', formValue.motherName ?? '');
    formData.append('husbandName', formValue.husbandName ?? '');
    formData.append('religion', formValue.religion ?? '');
    formData.append('caste', formValue.caste ?? '');
    formData.append('nationality', formValue.nationality ?? '');
    formData.append('bloodGroup', formValue.bloodGroup ?? '');
    formData.append('disablityType', formValue.disablityType ?? '');
    formData.append('maritalStatus', formValue.maritalStatus ?? '');
    const dateOfBirth = this.datePipe.transform(formValue.dateOfBirth, 'yyyy-MM-dd');
    formData.append('dateOfBirth', dateOfBirth ?? '');

    const photoFile = this.photoFile();
    const photoFileName = this.photoFileName();

    if (photoFile) {
      formData.append('photoFile', photoFile);
    }
    formData.append('photoName', photoFileName ?? '');
    if (!this.isEditMode()) {
      this.employeeService.create(formData).subscribe({
        next: (resp: any) => {
          this.alertService.success('Success', resp.message).then(() => {
            this.employeeStore.refreshList();
            const newId = resp.id;
            this.onSave.emit(newId);
          });
        },
        error: (err: any) => {},
      });
    } else {
      this.employeeService.updatePersonalInfo(this.empId(), formData).subscribe({
        next: (resp: any) => {
          this.alertService.success('Success', resp).then(() => {
            this.employeeStore.refreshList();
            this.employeeStore.refreshDetail();
            this.onUpdate.emit();
          });
        },
        error: (err: any) => {},
      });
    }
  }
}
