import { DatePipe } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService } from 'qubefin-core';
import { openTimePicker, toApiTime } from '../../../../hrms/components/interview-process/interview-time';
import { GROUP_DAYS } from '../../../models/group';
import { GROUP_ROLES, ICreateGroupFromSurveyRequest } from '../../../models/group-creation';
import { GroupCreationService } from '../../../services/group-creation-service';
import { GroupCreationStore } from '../../../stores/group-creation-store';

// What the Credit Officer fills in for one eligible borrower.
interface IMemberForm {
  selected: boolean;
  amount: number | null;
  purpose: string;
  remarks: string;
  // '' = a plain member; otherwise President, Secretary or Cashier
  role: string;
  appointmentDate: Date | null;
}

// The window where a Credit Officer of the survey creates the group after the GRT is a Pass: the group details,
// the eligible borrowers (with proposed loan, purpose and remarks) and the three leaders.
@Component({
  selector: 'qfin-group-create-modal',
  imports: [
    DatePipe,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatDatepickerModule,
    LucideDynamicIcon,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './group-create-modal.html',
})
export class GroupCreateModal {
  readonly dialogRef = inject(MatDialogRef<GroupCreateModal, boolean>);
  private readonly dialogData = inject<{ surveyId: string }>(MAT_DIALOG_DATA);
  private readonly store = inject(GroupCreationStore);
  private readonly service = inject(GroupCreationService);
  private readonly alertService = inject(AlertService);
  private readonly dateAdapter = inject(DateAdapter<Date>);
  private readonly dialog = inject(MatDialog);
  private readonly datePipe = new DatePipe('en-US');

  readonly info = this.store.info;
  readonly days = GROUP_DAYS;
  readonly roles = GROUP_ROLES;
  readonly today = new Date();
  readonly saving = signal(false);

  // The group details
  readonly name = signal('');
  readonly formationDate = signal<Date | null>(new Date());
  readonly collectionDay = signal<number | null>(null);
  readonly collectionTime = signal('');
  readonly mobileNo = signal('');
  readonly sittingPlace = signal('');
  readonly policeStation = signal('');
  readonly postOffice = signal('');
  readonly pinCode = signal('');
  readonly address = signal('');
  readonly landMark = signal('');
  readonly latitude = signal<number | null>(null);
  readonly longitude = signal<number | null>(null);

  // The eligible borrowers, by borrower id
  readonly members = signal<Record<string, IMemberForm>>({});

  constructor() {
    this.dateAdapter.setLocale('en-GB');
    this.store.setSurveyId(this.dialogData.surveyId);

    // Prefill from the survey once the window's information has loaded.
    effect(() => {
      const d = this.info();
      if (!d || !d.canCreate) return;
      // The group name starts as the proposed area of the survey (it can be edited).
      if (!this.name().trim()) this.name.set(d.proposedArea);
      this.landMark.set(d.landMark ?? '');
      this.latitude.set(d.latitude);
      this.longitude.set(d.longitude);
      const start: Record<string, IMemberForm> = {};
      for (const b of d.borrowers) {
        start[b.id] = { selected: false, amount: null, purpose: '', remarks: '', role: '', appointmentDate: null };
      }
      this.members.set(start);
    });
  }

  protected member(id: string): IMemberForm {
    return this.members()[id];
  }

  protected updateMember(id: string, change: Partial<IMemberForm>) {
    this.members.update((all) => ({ ...all, [id]: { ...all[id], ...change } }));
  }

  // The leader strip: the name of the selected member who holds the role, or null while the slot is empty.
  protected leaderName(role: string): string | null {
    const id = Object.entries(this.members()).find(([, m]) => m.selected && m.role === role)?.[0];
    return this.info()?.borrowers.find((b) => b.id === id)?.name ?? null;
  }

  protected leaderCount(): number {
    return this.roles.filter((r) => this.leaderName(r) !== null).length;
  }

  // The footer hint: what is still missing before the group can be created.
  protected footerHint(): string {
    if (this.selectedCount() === 0) return 'Select the eligible borrowers.';
    const missing = this.roles.filter((r) => this.leaderName(r) === null);
    return missing.length > 0 ? `Choose the ${missing.join(' and ')} to create the group.` : 'Everything is chosen. You can create the group.';
  }

  protected roleIcon(role: string): string {
    return role === 'President' ? 'badge-check' : role === 'Secretary' ? 'pencil' : 'wallet';
  }

  protected selectedCount(): number {
    return Object.values(this.members()).filter((m) => m.selected).length;
  }

  protected toggleSelected(id: string, selected: boolean) {
    // A member who is taken out of the group loses the leader role.
    this.updateMember(id, selected ? { selected } : { selected, role: '', appointmentDate: null });
  }

  // One person per role: choosing a role takes it from the person who had it.
  protected setRole(id: string, role: string) {
    this.members.update((all) => {
      const next: Record<string, IMemberForm> = {};
      for (const [key, m] of Object.entries(all)) {
        next[key] = role && m.role === role && key !== id ? { ...m, role: '', appointmentDate: null } : m;
      }
      next[id] = { ...next[id], role, appointmentDate: role ? (next[id].appointmentDate ?? new Date()) : null };
      return next;
    });

    // The group mobile number starts as the President's mobile.
    if (role === 'President' && !this.mobileNo().trim()) {
      const borrower = this.info()?.borrowers.find((b) => b.id === id);
      if (borrower) this.mobileNo.set(borrower.mobileNo);
    }
  }

  protected setNumber(target: 'amount', id: string, text: string) {
    const value = text.trim() === '' ? null : Number(text);
    this.updateMember(id, { [target]: value !== null && Number.isNaN(value) ? null : value });
  }

  // Update Location: fills the latitude and longitude from the browser location (same as the Group Survey form).
  protected useCurrentLocation() {
    if (!navigator.geolocation) {
      this.alertService.error('Oops ....', 'Your browser does not support location.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.latitude.set(Number(position.coords.latitude.toFixed(6)));
        this.longitude.set(Number(position.coords.longitude.toFixed(6)));
      },
      () => {
        this.alertService.error('Oops ....', 'Could not get your location. Please allow location access or enter it manually.');
      },
    );
  }

  protected setCoordinate(target: 'latitude' | 'longitude', text: string) {
    const value = text.trim() === '' ? null : Number(text);
    this[target].set(value !== null && Number.isNaN(value) ? null : value);
  }

  // The shared time picker (same as In Time / Out Time of a branch).
  protected openTimePicker() {
    openTimePicker(this.dialog, 'Group Time', this.collectionTime(), (time) => this.collectionTime.set(time));
  }

  protected save() {
    const d = this.info();
    if (!d) return;

    const problem = this.firstProblem();
    if (problem) {
      this.alertService.error('Oops ....', problem);
      return;
    }

    const all = this.members();
    const request: ICreateGroupFromSurveyRequest = {
      name: this.name().trim(),
      formationDate: this.datePipe.transform(this.formationDate(), 'yyyy-MM-dd') ?? '',
      collectionDay: this.collectionDay() as number,
      collectionTime: toApiTime(this.collectionTime()) ?? '',
      mobileNo: this.mobileNo().trim(),
      sittingPlace: this.sittingPlace().trim(),
      policeStation: this.policeStation().trim() || null,
      postOffice: this.postOffice().trim() || null,
      pinCode: this.pinCode().trim() || null,
      address: this.address().trim() || null,
      landMark: this.landMark().trim() || null,
      latitude: this.latitude(),
      longitude: this.longitude(),
      members: d.borrowers
        .filter((b) => all[b.id]?.selected)
        .map((b) => ({
          borrowerId: b.id,
          proposedLoanAmount: all[b.id].amount ?? 0,
          loanPurpose: all[b.id].purpose.trim(),
          remarks: all[b.id].remarks.trim() || null,
          role: all[b.id].role || null,
          appointmentDate: all[b.id].role ? this.datePipe.transform(all[b.id].appointmentDate, 'yyyy-MM-dd') : null,
        })),
    };

    this.alertService
      .confirm('Confirmation', `Do you want to create the group "${request.name}" with ${request.members.length} member(s)?`)
      .then((result) => {
        if (!result.isConfirmed) return;
        this.saving.set(true);
        this.service.create(this.dialogData.surveyId, request).subscribe({
          next: (resp: any) => {
            this.saving.set(false);
            this.alertService.success('Success', resp).then(() => this.dialogRef.close(true));
          },
          error: () => this.saving.set(false),
        });
      });
  }

  // The same rules as the server, so the user sees the problem before saving.
  private firstProblem(): string | null {
    if (!this.name().trim()) return 'Group Name is required.';
    if (this.name().trim().length > 50) return 'Group Name can be 50 characters at most.';
    if (!this.formationDate()) return 'Date of Group Formation is required.';
    if (!this.collectionDay()) return 'Please select the Group Day.';
    if (!this.collectionTime()) return 'Please select the Group Time.';
    if (!/^\d{10}$/.test(this.mobileNo().trim())) return 'Mobile No must be 10 digits.';
    if (!this.sittingPlace().trim()) return 'Sitting Place is required.';
    if (this.pinCode().trim() && !/^\d{6}$/.test(this.pinCode().trim())) return 'PIN Code must be 6 digits.';
    if ((this.latitude() === null) !== (this.longitude() === null)) return 'Enter both Latitude and Longitude, or neither.';

    const chosen = Object.entries(this.members()).filter(([, m]) => m.selected);
    if (chosen.length === 0) return 'Select at least one eligible borrower.';
    for (const [, m] of chosen) {
      if (m.amount === null || m.amount < 0) return 'Enter the Proposed Loan Amount of every selected member.';
      if (!m.purpose.trim()) return 'Enter the Purpose of Loan of every selected member.';
      if (m.role && !m.appointmentDate) return 'Enter the Date of Appointment of every leader.';
    }
    for (const role of GROUP_ROLES) {
      if (chosen.filter(([, m]) => m.role === role).length !== 1) {
        return 'Choose exactly one President, one Secretary and one Cashier from the selected members.';
      }
    }
    return null;
  }
}
