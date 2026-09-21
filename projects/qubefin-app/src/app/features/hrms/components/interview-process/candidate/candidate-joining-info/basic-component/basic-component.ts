import { Component, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, MatNativeDateModule } from '@angular/material/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { form, FormField, required, schema, Schema } from '@angular/forms/signals';
import { ICandidateUpdate } from '../../../../../models/candidate';

// 1. Define a strict interface for the local form fields
interface IBasicInfoLocal {
  firstName: string;
  middleName: string;
  lastName: string;
  gender: string;
  dateOfBirth: Date | null;
  bloodGroup: string;
  maritalStatus: string;
  fatherName: string;
  motherName: string;
  religion: string;
  nationality: string;
}

@Component({
  selector: 'qfin-basic-component',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    LucideDynamicIcon,
    FormField,
  ],
  providers: [DatePipe],
  templateUrl: './basic-component.html',
})
export class BasicComponent {
  masterData = input.required<ICandidateUpdate>();
  onSaveStep = output<Partial<ICandidateUpdate>>();

  private readonly datePipe = inject(DatePipe);
  private readonly dateAdapter = inject(DateAdapter<Date>);

  // 2. Explicitly type the Signal with the interface
  protected readonly localModel = signal<IBasicInfoLocal>({
    firstName: '',
    middleName: '',
    lastName: '',
    gender: '',
    dateOfBirth: null,
    bloodGroup: '',
    maritalStatus: '',
    fatherName: '',
    motherName: '',
    religion: '',
    nationality: '',
  });

  // 3. Explicitly type the Schema with the interface
  protected readonly localSchema: Schema<IBasicInfoLocal> = schema((path) => {
    required(path.firstName, { message: 'First Name is required' });
    required(path.lastName, { message: 'Last Name is required' });
    required(path.gender, { message: 'Gender is required' });
  });

  protected readonly basicForm = form(this.localModel, this.localSchema);

  constructor() {
    this.dateAdapter.setLocale('en-GB');

    effect(
      () => {
        const data = this.masterData();
        if (data) {
          this.localModel.set({
            firstName: data.firstName || '',
            middleName: data.middleName || '',
            lastName: data.lastName || '',
            gender: data.gender || '',
            dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
            bloodGroup: data.bloodGroup || '',
            maritalStatus: data.maritalStatus || '',
            fatherName: data.fatherName || '',
            motherName: data.motherName || '',
            religion: data.religion || '',
            nationality: data.nationality || '',
          });
        }
      },
      { allowSignalWrites: true },
    );
  }

  onSubmit() {
    this.basicForm().markAsTouched();
    if (!this.basicForm().valid()) {
      return;
    }

    const formData = this.basicForm().value();

    const formattedDoB = formData.dateOfBirth
      ? this.datePipe.transform(formData.dateOfBirth, 'yyyy-MM-dd')
      : null;

    this.onSaveStep.emit({
      firstName: formData.firstName,
      middleName: formData.middleName,
      lastName: formData.lastName,
      gender: formData.gender,
      dateOfBirth: formattedDoB,
      bloodGroup: formData.bloodGroup,
      maritalStatus: formData.maritalStatus,
      fatherName: formData.fatherName,
      motherName: formData.motherName,
      religion: formData.religion,
      nationality: formData.nationality,
    });
  }
}
