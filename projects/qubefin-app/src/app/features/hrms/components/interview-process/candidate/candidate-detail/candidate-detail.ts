import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  form,
  FormField,
  pattern,
  readonly,
  required,
  schema,
  Schema,
} from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AlertService, EMPTY_UUID, TimePickerDialogComponent } from 'qubefin-core';
import { LucideDynamicIcon } from '@lucide/angular';
import { MatStepperModule } from '@angular/material/stepper';
import { MatDialog } from '@angular/material/dialog';
import { CandidateStore } from '../../../../stores/candidate-store';
import { CandidateService } from '../../../../services/candidate-service';
import { ICandidate, ICandidateDetail } from '../../../../models/candidate';
import { DatePipe } from '@angular/common';
import { AttendanceRegularizationsStore } from '../../../../stores/attendance-regularizations-store';
import { CompanyStore } from '../../../../../global/stores/company-store';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { ApprovalWorkflowStore } from '../../../../stores/approval-workflow-store';
import { DateAdapter } from '@angular/material/core';
import { AdministrativeUnitCascade } from '../../../../../global/components/administrative-unit-cascade/administrative-unit-cascade';
import { AdministrativeUnitService } from '../../../../../global/services/administrative-unit-service';
import { IPoliceStationList } from '../../../../../global/models/police-sation';
import { IPostOfficeList } from '../../../../../global/models/post-office';
import { DepartmentStore } from '../../../../stores/department-store';
import { OrganizationUnitService } from '../../../../../global/services/organization-unit-service';
@Component({
  selector: 'qfin-candidate-detail',
  imports: [
    CommonModule,
    FormField,
    MatFormFieldModule,
    MatCheckboxModule,
    MatIconModule,
    MatInputModule,
    LucideDynamicIcon,
    MatSelectModule,
    MatDatepickerModule,
    AdministrativeUnitCascade,
    MatStepperModule,
  ],
  providers: [DatePipe],
  templateUrl: './candidate-detail.html',
  styles: ``,
})
export class CandidateDetail {
  readonly datePipe = inject(DatePipe);
  readonly dateAdapter = inject(DateAdapter<Date>);
  // readonly approvalWorkflowstore = inject(ApprovalWorkflowStore);
  private readonly attendRegularizationsStore = inject(AttendanceRegularizationsStore);
  private readonly candidateService = inject(CandidateService);
  private readonly alertService = inject(AlertService);
  private readonly dialog = inject(MatDialog);
  private readonly candidateStore = inject(CandidateStore);
  readonly companyStore = inject(CompanyStore);

  private readonly administrativeUnitService = inject(AdministrativeUnitService);
  private readonly departmentStore = inject(DepartmentStore);
  private readonly organizationUnitService = inject(OrganizationUnitService);

  readonly departments = this.departmentStore.departments;
  readonly organizationUnits = signal<any[]>([]);
  readonly postOffices = signal<IPostOfficeList[]>([]);
  readonly policeStations = signal<IPoliceStationList[]>([]);

  readonly companies = this.companyStore.companies;
  readonly posts = this.candidateStore.posts;
  protected readonly genders = computed(() => this.filterUtility('GENDER'));
  private filterUtility(sysKey: string) {
    const list = this.attendRegularizationsStore.utilities();
    return list.length > 0 ? list.filter((m: any) => m.sysKey === sysKey) : [];
  }
  readonly candidateId = input<string>(EMPTY_UUID);

  readonly cancel = output<void>();
  readonly save = output<void>();

  readonly isEditMode = computed(() => !!this.candidateId() && this.candidateId() !== EMPTY_UUID);

  readonly formModel = signal<ICandidateDetail>(this.createEmptyModel());

  readonly candidateSchema: Schema<ICandidateDetail> = schema((path) => {
    required(path.firstName, {
      message: 'First Name is required',
    });
    required(path.lastName, {
      message: 'Last Name is required',
    });
    required(path.gender, {
      message: 'Gender is required',
    });
    required(path.mobileNo, {
      message: 'Mobile No is required',
    });
    required(path.email, {
      message: 'Email is required',
    });
    required(path.fatherName, {
      message: 'Father is required',
    });

    required(path.companyId, {
      message: 'Company is required',
    });
    required(path.interviewPost, {
      message: 'Interview Post is required',
    });
    required(path.departmentId, {
      message: 'Department Post is required',
    });
    required(path.VenueOrganizationUnitId, {
      message: 'Venue Organization Unit is required',
    });
    required(path.interviewDate, {
      message: 'Interview Date is required',
    });
    required(path.interviewTime, {
      message: 'Interview Date is required',
    });

    required(path.administrativeUnitId, { message: 'Location details are required' });
    required(path.policeStationId, { message: 'Police Station is required' });
    required(path.pinCode, { message: 'Pin Code is required' });
    required(path.postOfficeId, { message: 'Post Office is required' });

    pattern(path.mobileNo, /^[6-9]\d{9}$/, { message: 'Enter a valid 10-digit mobile number' });
    pattern(path.pinCode, /^\d{6}$/, {
      message: 'Pin code must be exactly 6 digits (Characters are not allowed)',
    });
    pattern(path.email, /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
      message: 'Enter a valid Email Id',
    });
  });
  protected readonly candidateForm = form(this.formModel, this.candidateSchema);
  constructor() {
    this.dateAdapter.setLocale('en-GB');
    this.organizationUnitService.getAll().subscribe((res: any) => {
      this.organizationUnits.set(res);
    });
  }

  openInterviewTimePicker() {
    this.openTimePicker(
      'Interview Time',
      this.formModel().interviewTime as string,
      (time: string) => {
        this.formModel.update((m) => ({ ...m, interviewTime: time }));
      },
    );
  }

  private openTimePicker(title: string, currentTime: string, callback: (time: string) => void) {
    let currentHour = 12;
    let currentMinute = 0;
    let currentPeriod: 'AM' | 'PM' = 'AM';

    if (currentTime) {
      const parts = currentTime.split(' ');
      const timeParts = parts[0].split(':');
      currentHour = parseInt(timeParts[0], 10) || 12;
      currentMinute = parseInt(timeParts[1], 10) || 0;
      if (parts[1]) {
        currentPeriod = parts[1] as 'AM' | 'PM';
      } else {
        currentPeriod = currentHour >= 12 ? 'PM' : 'AM';
        currentHour = currentHour % 12 || 12;
      }
    }

    const dialogRef = this.dialog.open(TimePickerDialogComponent, {
      width: '340px',
      maxWidth: '95vw',
      panelClass: 'custom-time-picker-dialog',
      data: { title, currentHour, currentMinute, currentPeriod },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.formatted) {
        callback(result.formatted);
      }
    });
  }

  onCancel() {
    this.cancel.emit();
  }

  onSubmit() {
    this.candidateForm().markAsTouched();
    if (!this.candidateForm().valid()) {
      return;
    }
    const formValue = this.candidateForm().value();
    const dataToSave: any = {
      ...formValue,
      interviewDate: this.datePipe.transform(formValue.interviewDate, 'yyyy-MM-dd'),
      interviewTime: this.normalizeTimeValue(formValue.interviewTime),
    };

    dataToSave.administrativeUnitId =
      dataToSave.administrativeUnitId == '' ? null : dataToSave.administrativeUnitId;
    dataToSave.policeStationId =
      dataToSave.policeStationId == '' ? null : dataToSave.policeStationId;
    dataToSave.postOfficeId = dataToSave.postOfficeId == '' ? null : dataToSave.postOfficeId;
    dataToSave.departmentId = dataToSave.departmentId == '' ? null : dataToSave.departmentId;
    dataToSave.VenueOrganizationUnitId =
      dataToSave.VenueOrganizationUnitId == '' ? null : dataToSave.VenueOrganizationUnitId;
    this.candidateService.createCandidate(dataToSave).subscribe({
      next: (resp: any) => {
        this.alertService.success('Success', resp).then(() => {
          this.candidateStore.refreshList();
          this.save.emit();
        });
      },
      error: (err: any) => {},
    });
  }
  private normalizeTimeValue(value: string | Date | null): string | null {
    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      // Handle 12-hour format: 02:30 PM
      if (value.includes('AM') || value.includes('PM')) {
        const parts = value.trim().split(/\s+/);
        const timeParts = parts[0].split(':');

        let hour = parseInt(timeParts[0], 10);
        const minute = parseInt(timeParts[1] ?? '0', 10);
        const period = parts[1]?.toUpperCase();

        if (period === 'PM' && hour !== 12) {
          hour += 12;
        }

        if (period === 'AM' && hour === 12) {
          hour = 0;
        }

        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
      }

      // Handle HH:mm or HH:mm:ss
      const timeParts = value.split(':');

      const hour = String(timeParts[0]).padStart(2, '0');
      const minute = String(timeParts[1] ?? '0').padStart(2, '0');
      const second = String(timeParts[2] ?? '0').padStart(2, '0');

      return `${hour}:${minute}:${second}`;
    }

    // Date object
    return this.datePipe.transform(value, 'HH:mm:ss') ?? null;
  }
  updateAddressField<K extends keyof ICandidateDetail>(field: K, value: ICandidateDetail[K]) {
    this.formModel.update((current) => ({
      ...current,
      [field]: value,
    }));
  }

  onPinCodeChange(event: any) {
    const pinCode = event.target.value;

    if (pinCode && pinCode.toString().length === 6) {
      this.administrativeUnitService.getPostOfficeByPincode(pinCode.toString()).subscribe({
        next: (res: any) => {
          this.postOffices.set(res);
        },
      });
    } else {
      this.postOffices.set([]);
    }
  }

  onDistrictChangeForPoliceStation(districtId: string) {
    if (!districtId || districtId === EMPTY_UUID) {
      this.policeStations.set([]);
      return;
    }

    this.administrativeUnitService.getPoliceStationByDistrict(districtId).subscribe({
      next: (res: any) => {
        this.policeStations.set(res);
      },
    });
  }

  private createEmptyModel(): ICandidateDetail {
    return {
      companyId: '',
      firstName: '',
      middleName: '',
      lastName: '',
      gender: '',
      mobileNo: '',
      email: '',
      fatherName: '',
      interviewDate: '',
      interviewTime: '',
      interviewPost: '',
      departmentId: '',
      VenueOrganizationUnitId: '',
      houseNo: '',
      roadName: '',
      landMark: '',
      administrativeUnitId: '',
      policeStationId: '',
      postOfficeId: '',
      pinCode: '',
    };
  }
}
