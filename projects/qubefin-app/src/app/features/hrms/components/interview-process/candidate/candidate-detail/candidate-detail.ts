import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { AdministrativeUnitCascade } from '../../../../../global/components/administrative-unit-cascade/administrative-unit-cascade';
import { AdministrativeUnitService } from '../../../../../global/services/administrative-unit-service';
import { IPoliceStationList } from '../../../../../global/models/police-sation';
import { IPostOfficeList } from '../../../../../global/models/post-office';
import { DepartmentStore } from '../../../../stores/department-store';
import { OrganizationUnitService } from '../../../../../global/services/organization-unit-service';
import { OrganizationUnitTypeStore } from '../../../../../global/stores/organization-unit-type-store';
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
  providers: [provideNativeDateAdapter(), DatePipe],
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
  private readonly organizationUnitTypeStore = inject(OrganizationUnitTypeStore);
  readonly organizationUnitTypes = this.organizationUnitTypeStore.organizationUnitTypes;
  /** Units of the selected type, for the Posted Organization Unit dropdown. */
  readonly postedOrganizationUnits = signal<any[]>([]);
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
    // The reference number is issued per company, so the company is fixed once the candidate exists.
    disabled(path.companyId, () => this.isEditMode());
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
    pattern(path.monthlyCostCompany, /^\d+(\.\d{1,2})?$/, {
      message: 'Enter a valid amount',
    });
    pattern(path.pinCode, /^\d{6}$/, {
      message: 'Pin code must be exactly 6 digits (Characters are not allowed)',
    });
    pattern(path.email, /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
      message: 'Enter a valid Email Id',
    });
  });
  protected readonly candidateForm = form(this.formModel, this.candidateSchema);
  /** Edit mode fills the form once, from the candidate the view already loaded. */
  private loadedCandidateId: string | null = null;

  constructor() {
    this.dateAdapter.setLocale('en-GB');
    effect(() => {
      if (this.isEditMode()) {
        this.candidateStore.setCandidateId(this.candidateId());
      }
    });
    effect(() => {
      const candidate: any = this.candidateStore.candidate();
      if (!this.isEditMode() || !candidate || candidate.id !== this.candidateId()) return;
      if (this.loadedCandidateId === candidate.id) return;
      this.loadedCandidateId = candidate.id;
      this.populateForm(candidate);
    });
    // The saved posted unit only carries its id - take its type from the full unit list (which loads
    // independently) so both dropdowns show the saved selection.
    effect(() => {
      const model = this.formModel();
      const units = this.organizationUnits();
      if (
        !model.postedOrganizationUnitId ||
        model.postedOrganizationUnitTypeId ||
        units.length === 0
      )
        return;
      const unit = units.find((u: any) => u.id === model.postedOrganizationUnitId);
      if (unit?.organizationUnitTypeId) {
        this.formModel.update((m) => ({
          ...m,
          postedOrganizationUnitTypeId: unit.organizationUnitTypeId,
        }));
        this.loadPostedOrganizationUnits(unit.organizationUnitTypeId);
      }
    });
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

  openReportingTimePicker() {
    this.openTimePicker('Reporting Time', this.formModel().reportingTime, (time: string) => {
      this.formModel.update((m) => ({ ...m, reportingTime: time }));
    });
  }

  onPostedOrganizationUnitTypeChange(typeId: string) {
    this.formModel.update((m) => ({ ...m, postedOrganizationUnitId: '' }));
    this.loadPostedOrganizationUnits(typeId);
  }

  private loadPostedOrganizationUnits(typeId: string) {
    if (!typeId) {
      this.postedOrganizationUnits.set([]);
      return;
    }
    this.organizationUnitService.getOrganizationUnitByType(typeId).subscribe({
      next: (res: any) => this.postedOrganizationUnits.set(res ?? []),
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
    const { postedOrganizationUnitTypeId, ...formValue } = this.candidateForm().value();
    const dataToSave: any = {
      ...formValue,
      interviewDate: this.datePipe.transform(formValue.interviewDate, 'yyyy-MM-dd'),
      interviewTime: this.normalizeTimeValue(formValue.interviewTime),
      postedOrganizationUnitId: formValue.postedOrganizationUnitId || null,
      dateOfJoining: formValue.dateOfJoining
        ? this.datePipe.transform(formValue.dateOfJoining, 'yyyy-MM-dd')
        : null,
      reportingTime: this.normalizeTimeValue(formValue.reportingTime),
      monthlyCostCompany: formValue.monthlyCostCompany
        ? Number(formValue.monthlyCostCompany)
        : null,
    };

    dataToSave.administrativeUnitId =
      dataToSave.administrativeUnitId == '' ? null : dataToSave.administrativeUnitId;
    dataToSave.policeStationId =
      dataToSave.policeStationId == '' ? null : dataToSave.policeStationId;
    dataToSave.postOfficeId = dataToSave.postOfficeId == '' ? null : dataToSave.postOfficeId;
    dataToSave.departmentId = dataToSave.departmentId == '' ? null : dataToSave.departmentId;
    dataToSave.VenueOrganizationUnitId =
      dataToSave.VenueOrganizationUnitId == '' ? null : dataToSave.VenueOrganizationUnitId;
    const request = this.isEditMode()
      ? this.candidateService.updateCandidate(this.candidateId(), dataToSave)
      : this.candidateService.createCandidate(dataToSave);
    request.subscribe({
      next: (resp: any) => {
        this.alertService.success('Success', resp).then(() => {
          this.candidateStore.refreshList();
          if (this.isEditMode()) {
            this.candidateStore.refreshDetail();
          }
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

  private populateForm(candidate: any) {
    this.formModel.set({
      companyId: candidate.companyId ?? '',
      firstName: candidate.firstName ?? '',
      middleName: candidate.middleName ?? '',
      lastName: candidate.lastName ?? '',
      gender: candidate.gender ?? '',
      mobileNo: candidate.mobileNo ?? '',
      email: candidate.email ?? '',
      fatherName: candidate.fatherName ?? '',
      interviewDate: this.toLocalDate(candidate.interviewDate) as any,
      interviewTime: this.toDisplayTime(candidate.interviewTime),
      interviewPost: candidate.interviewPost ?? '',
      departmentId: candidate.departmentId ?? '',
      VenueOrganizationUnitId: candidate.venueOrganizationUnitId ?? '',
      houseNo: candidate.houseNo ?? '',
      roadName: candidate.roadName ?? '',
      landMark: candidate.landMark ?? '',
      administrativeUnitId: candidate.administrativeUnitId ?? '',
      policeStationId: candidate.policeStationId ?? '',
      postOfficeId: candidate.postOfficeId ?? '',
      pinCode: candidate.pinCode ?? '',
      postedOrganizationUnitTypeId: '',
      postedOrganizationUnitId: candidate.postedOrganizationUnitId ?? '',
      dateOfJoining: this.toLocalDate(candidate.dateOfJoining) as any,
      reportingTime: this.toDisplayTime(candidate.reportingTime),
      monthlyCostCompany:
        candidate.monthlyCostCompany != null ? String(candidate.monthlyCostCompany) : '',
    });

    // Load the dropdown options the saved selections belong to.
    if (candidate.pinCode) {
      this.onPinCodeChange({ target: { value: candidate.pinCode } });
    }
  }

  /** "2026-09-25" -> local-midnight Date (new Date("yyyy-MM-dd") would be UTC and can shift a day). */
  private toLocalDate(value: string | null | undefined): Date | '' {
    if (!value) return '';
    const [y, m, d] = value.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  /** "14:30:00" -> "02:30 PM", the format the time picker writes. */
  private toDisplayTime(value: string | null | undefined): string {
    if (!value) return '';
    const [h, m] = value.split(':').map((part) => parseInt(part, 10));
    if (isNaN(h)) return '';
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${String(hour).padStart(2, '0')}:${String(m || 0).padStart(2, '0')} ${period}`;
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
      postedOrganizationUnitTypeId: '',
      postedOrganizationUnitId: '',
      dateOfJoining: '',
      reportingTime: '',
      monthlyCostCompany: '',
    };
  }
}
