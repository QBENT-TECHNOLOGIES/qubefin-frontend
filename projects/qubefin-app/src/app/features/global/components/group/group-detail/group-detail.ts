import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { provideNativeDateAdapter, DateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import { MatDialog } from '@angular/material/dialog';
import { openTimePicker, toApiTime, toDisplayTime } from '../../../../hrms/components/interview-process/interview-time';
import { GROUP_DAYS, IGroupRequest } from '../../../models/group';
import { GroupService } from '../../../services/group-service';
import { GroupStore } from '../../../stores/group-store';
import { AdministrativeUnitCascade } from '../../administrative-unit-cascade/administrative-unit-cascade';

// What the user types. Dates are Date objects here and become 'yyyy-MM-dd' when saved.
interface IGroupFormModel {
  surveyId: string | null;
  designationId: string;
  name: string;
  collectionDay: number | null;
  collectionTime: string;
  biweeklyStartDate: Date | null;
  formationDate: Date | null;
  mobileNo: string;
  administrativeUnitId: string;
  pinCode: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  landMark: string;
}

// Add or edit a group: the columns of Tbl_Group. A group is normally added from an Approved Group Survey,
// but it can also be added manually.
@Component({
  selector: 'qfin-group-detail',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDatepickerModule,
    LucideDynamicIcon,
    AdministrativeUnitCascade,
  ],
  providers: [provideNativeDateAdapter(), DatePipe],
  templateUrl: './group-detail.html',
})
export class GroupDetail {
  private readonly store = inject(GroupStore);
  private readonly service = inject(GroupService);
  private readonly alertService = inject(AlertService);
  private readonly datePipe = inject(DatePipe);
  private readonly dateAdapter = inject(DateAdapter<Date>);
  private readonly dialog = inject(MatDialog);

  readonly groupId = input<string>(EMPTY_UUID);
  // Set when the group is created from a survey page: that survey is chosen at the start.
  readonly initialSurveyId = input<string | null>(null);
  readonly cancel = output<void>();
  readonly save = output<void>();
  private initialSurveyApplied = false;

  readonly days = GROUP_DAYS;
  readonly today = new Date();
  readonly isEditMode = computed(() => this.groupId() !== EMPTY_UUID);

  readonly addInfo = this.store.addInfo;
  readonly group = this.store.group;
  readonly saving = signal(false);

  protected readonly model = signal<IGroupFormModel>(this.emptyModel());

  // The branch and the Credit Officers: from the add info (new group) or from the group itself (edit).
  readonly branchName = computed(() => (this.isEditMode() ? this.group()?.branchName : this.addInfo()?.branchName) ?? '');
  readonly creditOfficers = computed(() => this.addInfo()?.creditOfficers ?? []);
  readonly surveys = computed(() => this.addInfo()?.surveys ?? []);
  readonly creditOfficerName = computed(() => this.group()?.creditOfficerName ?? '');
  // A Credit Officer adds only for himself, so there is nothing to choose.
  readonly canChooseCreditOfficer = computed(() => this.creditOfficers().length > 1 || this.addInfo()?.isHead === true);

  constructor() {
    this.dateAdapter.setLocale('en-GB');

    effect(() => {
      this.store.setGroupId(this.groupId());
    });

    // A new group starts with the only Credit Officer, if there is just one (a Credit Officer adding for himself).
    effect(() => {
      if (this.isEditMode()) return;
      const officers = this.creditOfficers();
      if (officers.length === 1 && !untracked(() => this.model().designationId)) {
        untracked(() => this.update('designationId', officers[0].designationId));
      }
    });

    // Coming from a survey page: choose that survey once the list of approved surveys has loaded.
    effect(() => {
      const surveyId = this.initialSurveyId();
      if (this.isEditMode() || !surveyId || this.initialSurveyApplied) return;
      if (this.surveys().some((s) => s.id === surveyId)) {
        this.initialSurveyApplied = true;
        untracked(() => this.onSurveyChange(surveyId));
      }
    });

    // Edit: fill the form from the saved group.
    effect(() => {
      const g = this.group();
      if (!this.isEditMode() || !g) return;
      this.model.set({
        surveyId: g.surveyId,
        designationId: g.designationId ?? '',
        name: g.name,
        collectionDay: g.collectionDay,
        collectionTime: toDisplayTime(g.collectionTime),
        biweeklyStartDate: this.toDate(g.biweeklyStartDate),
        formationDate: this.toDate(g.formationDate),
        mobileNo: g.mobileNo,
        administrativeUnitId: g.administrativeUnitId,
        pinCode: g.pinCode ?? '',
        address: g.address ?? '',
        latitude: g.latitude,
        longitude: g.longitude,
        landMark: g.landMark ?? '',
      });
    });
  }

  private emptyModel(): IGroupFormModel {
    return {
      surveyId: null,
      designationId: '',
      name: '',
      collectionDay: null,
      collectionTime: '',
      biweeklyStartDate: null,
      formationDate: new Date(),
      mobileNo: '',
      administrativeUnitId: '',
      pinCode: '',
      address: '',
      latitude: null,
      longitude: null,
      landMark: '',
    };
  }

  protected update<K extends keyof IGroupFormModel>(field: K, value: IGroupFormModel[K]) {
    this.model.update((current) => ({ ...current, [field]: value }));
  }

  protected updateNumber(field: 'latitude' | 'longitude', text: string) {
    const value = text.trim() === '' ? null : Number(text);
    this.update(field, value !== null && Number.isNaN(value) ? null : value);
  }

  // "yyyy-MM-dd" to a local Date (no time zone shift).
  private toDate(text: string | null): Date | null {
    if (!text) return null;
    const [y, m, d] = text.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  // Choosing an Approved Group Survey fills the area, location and landmark. "Manual" clears the survey link.
  protected onSurveyChange(surveyId: string | null) {
    const survey = this.surveys().find((s) => s.id === surveyId);
    this.model.update((current) => ({
      ...current,
      surveyId: survey?.id ?? null,
      administrativeUnitId: survey?.administrativeUnitId ?? current.administrativeUnitId,
      latitude: survey?.latitude ?? current.latitude,
      longitude: survey?.longitude ?? current.longitude,
      landMark: survey?.landMark ?? current.landMark,
    }));
  }

  // The shared time picker (same as In Time / Out Time of a branch).
  protected openCollectionTimePicker() {
    openTimePicker(this.dialog, 'Collection Time', this.model().collectionTime, (time) =>
      this.update('collectionTime', time),
    );
  }

  protected onSubmit() {
    const m = this.model();
    const problem = this.firstProblem(m);
    if (problem) {
      this.alertService.error('Oops ....', problem);
      return;
    }

    const request: IGroupRequest = {
      surveyId: m.surveyId,
      designationId: m.designationId,
      name: m.name.trim(),
      collectionDay: m.collectionDay as number,
      collectionTime: toApiTime(m.collectionTime) ?? '',
      biweeklyStartDate: m.biweeklyStartDate ? this.datePipe.transform(m.biweeklyStartDate, 'yyyy-MM-dd') : null,
      formationDate: this.datePipe.transform(m.formationDate, 'yyyy-MM-dd') ?? '',
      mobileNo: m.mobileNo.trim(),
      administrativeUnitId: m.administrativeUnitId,
      pinCode: m.pinCode.trim() || null,
      address: m.address.trim() || null,
      latitude: m.latitude,
      longitude: m.longitude,
      landMark: m.landMark.trim() || null,
    };

    this.alertService
      .confirm('Confirmation', `Do you want to ${this.isEditMode() ? 'update' : 'add'} this group?`)
      .then((result) => {
        if (!result.isConfirmed) return;
        this.saving.set(true);
        const call = this.isEditMode() ? this.service.update(this.groupId(), request) : this.service.create(request);
        call.subscribe({
          next: (resp: any) => {
            this.saving.set(false);
            this.alertService.success('Success', resp).then(() => {
              this.store.refreshList();
              if (this.isEditMode()) this.store.refreshDetail();
              this.save.emit();
            });
          },
          error: () => this.saving.set(false),
        });
      });
  }

  // The same rules as the server, so the user sees the problem before saving.
  private firstProblem(m: IGroupFormModel): string | null {
    if (!m.designationId) return 'Please select the Credit Officer.';
    if (!m.name.trim()) return 'Group Name is required.';
    if (m.name.trim().length > 50) return 'Group Name can be 50 characters at most.';
    if (!m.collectionDay) return 'Please select the Collection Day.';
    if (!m.collectionTime) return 'Please enter the Collection Time.';
    if (!m.formationDate) return 'Formation Date is required.';
    if (!/^\d{10}$/.test(m.mobileNo.trim())) return 'Mobile No must be 10 digits.';
    if (!m.administrativeUnitId) return 'Please select the Area down to the Village or Ward.';
    if (m.pinCode.trim() && !/^\d{6}$/.test(m.pinCode.trim())) return 'PIN Code must be 6 digits.';
    if (m.address.length > 500) return 'Address can be 500 characters at most.';
    if (m.landMark.length > 100) return 'Landmark can be 100 characters at most.';
    if ((m.latitude === null) !== (m.longitude === null)) return 'Enter both Latitude and Longitude, or neither.';
    if (m.latitude !== null && (m.latitude < -90 || m.latitude > 90)) return 'Latitude must be between -90 and 90.';
    if (m.longitude !== null && (m.longitude < -180 || m.longitude > 180)) return 'Longitude must be between -180 and 180.';
    return null;
  }

  protected onCancel() {
    this.cancel.emit();
  }
}
