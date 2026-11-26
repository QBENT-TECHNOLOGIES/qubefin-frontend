import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { DateAdapter, MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';
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
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService, EMPTY_UUID, nationalities } from 'qubefin-core';
import { Subject, catchError, debounceTime, of, switchMap, tap } from 'rxjs';
import { APP_ICONS_MAP } from '../../../../../../lucide-icons';
import { LoggedInUserInfoStore } from '../../../../../../layouts/secure/store/logged-in-user-info-store';
import {
  IGroupSearchByText,
  IMemberPersonalInfo,
  IMemberPersonalRequest,
  MemberPersonalInfo,
  Utility,
} from '../../../../models/member-detail';
import { MemberService } from '../../../../services/member-services';
import { MemberStore } from '../../../../stores/member-store';

@Component({
  selector: 'qfin-personal-component',
  providers: [provideNativeDateAdapter(), DatePipe],
  imports: [
    CommonModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    FormField,
    MatStepperModule,
    LucideDynamicIcon,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  templateUrl: './personal-component.html',
})
export class PersonalComponent {
  memberId = input<string>(EMPTY_UUID);
  utilities = input<Utility[]>([]);
  activeIndex = input<number>(0);
  onSave = output<string>();
  onUpdate = output<void>();

  private readonly dateAdapter = inject(DateAdapter<Date>);
  private readonly datePipe = inject(DatePipe);
  private readonly memberStore = inject(MemberStore);
  readonly userStore = inject(LoggedInUserInfoStore);
  private readonly memberService = inject(MemberService);
  private readonly alertService = inject(AlertService);
  readonly nationalities = nationalities;
  readonly maxDate = new Date();
  readonly iconMap = APP_ICONS_MAP;
  readonly isEditMode = computed(() => !!this.memberId() && this.memberId() !== EMPTY_UUID);

  // --- Group Search State ---
  readonly groupOptions = signal<IGroupSearchByText[]>([]);
  readonly groupSearchText = signal<string>('');
  private readonly groupSearch$ = new Subject<string>();

  protected readonly memberModel = signal<IMemberPersonalInfo>(new MemberPersonalInfo());

  protected readonly memberSchema: Schema<IMemberPersonalInfo> = schema((path) => {
    readonly(path.admissionDate, { when: () => true });
    readonly(path.branchCode, { when: () => true });
    readonly(path.branchName, { when: () => true });
    readonly(path.groupName, { when: () => true });
    readonly(path.creditOfficerName, { when: () => true });
    readonly(path.employeeCode, { when: () => true });
    required(path.branchCode, { message: 'Branch code is required.' });
    required(path.groupCode, { message: 'Group is required.' });
    required(path.groupId, { message: 'Group is required.' });
    required(path.firstName, { message: 'First name is required.' });
    pattern(path.firstName, /^[A-Za-z]{3,30}$/, {
      message: 'First name must be 3 to 30 letters.',
    });
    pattern(path.middleName, /^[A-Za-z]*$/, {
      message: 'Invalid middle name.',
    });
    pattern(path.lastName, /^[A-Za-z]{0,30}$/, {
      message: 'Last name must contain only letters.',
    });
    required(path.dateOfBirth, { message: 'Date of birth is required.' });
    required(path.gender, { message: 'Gender is required.' });
    required(path.mobileNo, { message: 'Mobile number is required.' });
    pattern(path.mobileNo, /^[0-9]{10}$/, {
      message: 'Mobile number must be 10 digits.',
    });
    readonly(path.age, { when: () => true });
    readonly(path.dateOfBirth, { when: () => true });
    disabled(path.branchCode, { when: () => true });
    disabled(path.branchName, { when: () => true });
    disabled(path.groupName, { when: () => true });
    disabled(path.groupCode, { when: () => true });
    disabled(path.creditOfficerName, { when: () => true });
    disabled(path.employeeCode, { when: () => true });
  });

  protected readonly memberForm = form(this.memberModel, this.memberSchema);

  protected readonly salutations = computed(() => this.filterUtility('SALUTAION'));
  protected readonly genders = computed(() => this.filterUtility('GENDER'));
  protected readonly religions = computed(() => this.filterUtility('RELIGION'));
  protected readonly castes = computed(() => this.filterUtility('CASTE'));
  protected readonly maritalStatuses = computed(() => this.filterUtility('MARITALSTATUS'));

  private filterUtility(sysKey: string) {
    const list = this.utilities();
    return list.length > 0 ? list.filter((m) => m.sysKey === sysKey) : [];
  }

  private personalDataResource = rxResource({
    params: () => ({ id: this.memberId() }),
    stream: ({ params }) => {
      if (params.id && params.id !== EMPTY_UUID) {
        this.memberStore.setMemberComponentId(params.id);

        return this.memberService.getPersonalData(params.id).pipe(
          tap((resp: any) => {
            if (resp) {
              const info = new MemberPersonalInfo(resp);
              this.memberModel.set(info);
              this.groupSearchText.set(info.groupCode || info.groupName || '');
            }
          }),
          catchError(() => of(null)),
        );
      } else {
        this.memberModel.set(new MemberPersonalInfo());
        this.groupSearchText.set('');
        this.groupOptions.set([]);
        return of(null);
      }
    },
  });

  constructor() {
    this.dateAdapter.setLocale('en-GB');

    // Group Search Pipeline
    this.groupSearch$
      .pipe(
        debounceTime(250),
        switchMap((searchText) =>
          this.memberService.getGroupsBySearchText(searchText).pipe(catchError(() => of([]))),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((resp: any) => {
        this.groupOptions.set(resp ?? []);
      });

    // Auto-calculate Age from DOB
    effect(() => {
      const dobValue = this.memberForm.dateOfBirth().value();
      if (dobValue) {
        const dob = new Date(dobValue);
        const today = new Date();
        let calculatedAge = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
          calculatedAge--;
        }
        this.memberForm.age().value.set(calculatedAge);
      } else {
        this.memberForm.age().value.set(null);
      }
    });

    // Auto-fill Branch, Credit Officer Name & Employee Code from login-info (Create mode only)
    effect(() => {
      if (this.isEditMode()) return;
      if (!this.userStore.loggedInUserInfoResource.hasValue()) return;
      const userInfo = this.userStore.loggedInUserInfo();
      if (!userInfo) return;

      const officerName = userInfo.employee ?? '';
      const empCode = userInfo.employeeCode ?? '';
      const unit = userInfo.accessOrganizationUnits?.[0];
      const branchCode = unit?.code ? Number(unit.code) : null;
      const branchName = unit?.name ?? '';

      if (this.memberForm.creditOfficerName().value() !== officerName) {
        this.memberForm.creditOfficerName().value.set(officerName);
      }
      if (this.memberForm.employeeCode().value() !== empCode) {
        this.memberForm.employeeCode().value.set(empCode);
      }
      if (this.memberForm.branchCode().value() !== branchCode) {
        this.memberForm.branchCode().value.set(branchCode);
      }
      if (this.memberForm.branchName().value() !== branchName) {
        this.memberForm.branchName().value.set(branchName);
      }
    });
  }

  // --- Group Search Actions ---
  protected onGroupFocus() {
    if (this.groupOptions().length === 0) {
      this.groupSearch$.next(this.groupSearchText().trim());
    }
  }

  protected searchGroups(searchText: string) {
    this.groupSearchText.set(searchText);
    this.memberForm.groupId().value.set('');
    this.memberForm.groupName().value.set('');
    this.groupSearch$.next(searchText.trim());
  }

  protected selectGroup(event: MatAutocompleteSelectedEvent) {
    const group = event.option.value as IGroupSearchByText;
    const code = group.groupCode || group.name || '';

    this.groupSearchText.set(code);
    this.memberForm.groupId().value.set(group.id);
    this.memberForm.groupCode().value.set(code);
    this.memberForm.groupName().value.set(group.name ?? '');
  }

  protected displayGroupCode = (group: IGroupSearchByText | string | null): string => {
    if (!group) {
      return '';
    }
    return typeof group === 'string' ? group : (group.groupCode ?? group.name ?? '');
  };

  protected onGroupPanelClosed() {
    if (!this.memberForm.groupId().value()) {
      this.groupSearchText.set('');
      this.memberForm.groupCode().value.set('');
      this.memberForm.groupName().value.set('');
    }
  }

  onSubmit() {
    if (!this.memberForm.groupId().value()) {
      this.groupSearchText.set('');
      this.memberForm.groupCode().value.set('');
    }

    this.memberForm().markAsTouched();
    if (!this.memberForm().valid()) {
      return;
    }

    const formValue = this.memberForm().value();
    const dateOfBirth = this.datePipe.transform(formValue.dateOfBirth, 'yyyy-MM-dd') ?? '';

    const payload: IMemberPersonalRequest = {
      branchCode: Number(formValue.branchCode),
      groupId: formValue.groupId || null,
      salutaion: formValue.salutation || null,
      firstName: formValue.firstName.trim(),
      middleName: formValue.middleName?.trim() || null,
      lastName: formValue.lastName?.trim() || null,
      guardianName: formValue.guardianName?.trim() || null,
      motherName: formValue.motherName?.trim() || null,
      spouseName: formValue.spouseName?.trim() || null,
      dateOfBirth,
      gender: formValue.gender || null,
      religion: formValue.religion || null,
      caste: formValue.caste || null,
      nationality: formValue.nationality || null,
      maritalStatus: formValue.maritalStatus || null,
      educationalQualification: formValue.educationalQualification?.trim() || null,
      mobileNo: formValue.mobileNo.trim(),
      alternateMobileNo: formValue.alternateMobileNo?.trim() || null,
    };

    if (!this.isEditMode()) {
      this.memberService.create(payload).subscribe({
        next: (resp: any) => {
          this.alertService.success('Success', resp.message).then(() => {
            this.memberStore.refreshList();
            this.onSave.emit(resp.id);
          });
        },
        error: () => {},
      });
    } else {
      this.memberService.updatePersonalInfo(this.memberId(), payload).subscribe({
        next: (resp: any) => {
          this.alertService.success('Success', resp).then(() => {
            this.memberStore.refreshList();
            this.memberStore.refreshDetail();
            this.onUpdate.emit();
          });
        },
        error: () => {},
      });
    }
  }
}
