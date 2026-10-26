import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { AlertService, DocumentModalService, EMPTY_UUID, nationalities } from 'qubefin-core';
import { form, FormField, readonly, required, schema, Schema } from '@angular/forms/signals';
import { LucideDynamicIcon } from '@lucide/angular';
import { MatStepperModule } from '@angular/material/stepper';
import { CandidateJoiningService } from '../../../../../services/candidate-joining.service';
import { APP_ICONS_MAP } from '../../../../../../../lucide-icons';
import {
  EmployeePersonalInfo,
  IEmployeePersonalInfo,
  Utility,
} from '../../../../../models/employee-detail';
import { rxResource } from '@angular/core/rxjs-interop';
import { of, tap } from 'rxjs';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

// Passport size photo / signature picked on the Personal step. `fileUrl` is the stored file, `rawFile` a newly
// picked one that has not been saved yet.
interface JoiningImage {
  fileName: string;
  fileUrl: string;
  rawFile: File | null;
  previewUrl: string;
}

type JoiningImageField = 'photo' | 'signature';

const emptyImage = (): JoiningImage => ({ fileName: '', fileUrl: '', rawFile: null, previewUrl: '' });

@Component({
  selector: 'qfin-joining-personal-component',
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
export class JoiningPersonalComponent {
  candidateId = input<string>(EMPTY_UUID);
  utilities = input<Utility[]>([]);
  activeIndex = input<number>(0);
  onSave = output<string>();
  onUpdate = output<void>();

  private dateAdapter = inject(DateAdapter<Date>);
  readonly maxDate = new Date();
  readonly nationalities = nationalities;
  private readonly datePipe = inject(DatePipe);
  private readonly candidateJoiningService = inject(CandidateJoiningService);
  private readonly alertService = inject(AlertService);
  readonly documentModal = inject(DocumentModalService);
  readonly iconMap = APP_ICONS_MAP;

  // The employee created from this candidate; empty until the Personal step is saved the first time.
  protected readonly employeeId = signal<string>(EMPTY_UUID);
  isEditMode = computed(() => !!this.employeeId() && this.employeeId() !== EMPTY_UUID);

  protected readonly imageFields: { key: JoiningImageField; label: string; icon: string }[] = [
    { key: 'photo', label: 'Recent Passport Size Photo', icon: 'user-round' },
    { key: 'signature', label: 'Signature', icon: 'pencil' },
  ];
  protected readonly photo = signal<JoiningImage>(emptyImage());
  protected readonly signature = signal<JoiningImage>(emptyImage());

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

  // Prefilled from the candidate until the employee exists, then read back from the employee.
  private personalDataResource = rxResource({
    params: () => ({ id: this.candidateId() }),
    stream: ({ params }) => {
      if (params.id && params.id !== EMPTY_UUID) {
        return this.candidateJoiningService.getPresonalData(params.id).pipe(
          tap((resp: any) => {
            if (resp && typeof resp.bloodGroup === 'string') {
              resp.bloodGroup = resp.bloodGroup.trim();
            }
            const model = new EmployeePersonalInfo(resp);
            if (!resp?.dateOfBirth) {
              model.dateOfBirth = null;
            }
            this.employeeModel.set(model);
            this.employeeId.set(resp?.employeeId ?? EMPTY_UUID);
            this.photo.set({
              ...emptyImage(),
              fileName: resp?.photoFileName ?? '',
              fileUrl: resp?.photoFileUrl ?? '',
              previewUrl: resp?.photoFileUrl ?? '',
            });
            this.signature.set({
              ...emptyImage(),
              fileName: resp?.signatureFileName ?? '',
              fileUrl: resp?.signatureFileUrl ?? '',
              previewUrl: resp?.signatureFileUrl ?? '',
            });
          }),
        );
      } else {
        this.employeeModel.set(new EmployeePersonalInfo());
        this.employeeId.set(EMPTY_UUID);
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
  loadSalutation() {
    return this.utilities().length > 0
      ? this.utilities().filter((m: any) => m.sysKey == 'SALUTAION')
      : [];
  }

  private imageSignal(field: JoiningImageField) {
    return field === 'photo' ? this.photo : this.signature;
  }

  onImageSelected(event: Event, field: JoiningImageField) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      input.value = '';
      this.alertService.warning(null, 'Only image file can be selected.');
      return;
    }

    this.imageSignal(field).update((image) => ({
      ...image,
      fileName: file.name,
      rawFile: file,
      previewUrl: URL.createObjectURL(file),
    }));
    input.value = '';
  }

  removeImage(field: JoiningImageField) {
    this.imageSignal(field).set(emptyImage());
  }

  openImage(field: JoiningImageField) {
    const image = this.imageSignal(field)();
    const name = image.fileName || (field === 'photo' ? 'Photo' : 'Signature');
    const url = image.rawFile ? URL.createObjectURL(image.rawFile) : image.fileUrl;

    if (!url) {
      this.alertService.warning('Oops!', 'Document preview is not available.');
      return;
    }

    this.documentModal.open({
      url: url,
      documentName: name,
      extension: name.split('.').pop()?.toLowerCase() || '',
      downloadAccess: true,
    });
  }

  onSubmit() {
    this.employeeForm().markAsTouched();
    if (!this.employeeForm().valid()) {
      return;
    }
    if (!this.photo().fileName) {
      this.alertService.warning(null, 'Please upload the passport size photo.');
      return;
    }
    if (!this.signature().fileName) {
      this.alertService.warning(null, 'Please upload the signature.');
      return;
    }

    const formValue = this.employeeForm().value();
    const dataToSave: any = {
      ...formValue,
      dateOfBirth: this.datePipe.transform(formValue.dateOfBirth, 'yyyy-MM-dd'),
      middleName: formValue.middleName?.trim() === '' ? null : formValue.middleName,
      fatherName: formValue.fatherName?.trim() === '' ? null : formValue.fatherName,
      husbandName: formValue.husbandName?.trim() === '' ? null : formValue.husbandName,
      motherName: formValue.motherName?.trim() === '' ? null : formValue.motherName,
      caste: formValue.caste?.trim() === '' ? null : formValue.caste,
      disablityType: formValue.disablityType?.trim() === '' ? null : formValue.disablityType,
      salutation: formValue.salutation?.trim() === '' ? null : formValue.salutation,
    };
    delete dataToSave.age;
    delete dataToSave.fullName;

    const formData = new FormData();
    Object.entries(dataToSave).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        formData.append(key, String(value));
      }
    });
    const photo = this.photo().rawFile;
    if (photo) {
      formData.append('photo', photo, photo.name);
    }
    const signature = this.signature().rawFile;
    if (signature) {
      formData.append('signature', signature, signature.name);
    }

    const wasEditMode = this.isEditMode();
    this.candidateJoiningService.savePersonalInfo(this.candidateId(), formData).subscribe({
      next: (resp: any) => {
        this.alertService.success('Success', resp.message).then(() => {
          this.employeeId.set(resp.employeeId);
          if (!wasEditMode) {
            this.onSave.emit(resp.employeeId);
          } else {
            this.onUpdate.emit();
          }
        });
      },
      error: (err: any) => {},
    });
  }
}
