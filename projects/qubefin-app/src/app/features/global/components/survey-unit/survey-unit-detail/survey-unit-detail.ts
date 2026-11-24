import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { SurveyStore } from '../../../stores/survey-store';
import { SurveyService } from '../../../services/survey-service';
import { EmployeeService } from '../../../../hrms/services/employee-service';
import { AdministrativeUnitService } from '../../../services/administrative-unit-service';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { CommonModule, DatePipe } from '@angular/common';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import { ISurveyDetail } from '../../../models/survey';
import { EmployeeSearchByText } from '../../../../hrms/models/employee-search-by-text';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { form, readonly, required, Schema, schema } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { LucideDynamicIcon } from '@lucide/angular';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdministrativeUnitCascade } from '../../administrative-unit-cascade/administrative-unit-cascade';

@Component({
  selector: 'qfin-survey-unit-detail',
  imports: [
    CommonModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatCheckboxModule,
    MatIconModule,
    MatInputModule,
    LucideDynamicIcon,
    MatDatepickerModule,
    MatSelectModule,
    MatTooltipModule,
    AdministrativeUnitCascade,
  ],
  providers: [provideNativeDateAdapter(), DatePipe],
  templateUrl: './survey-unit-detail.html',
  styles: ``,
})
export class SurveyUnitDetail {
  private readonly surveyStore = inject(SurveyStore);
  private readonly surveyService = inject(SurveyService);
  private readonly employeeService = inject(EmployeeService);
  private readonly alertService = inject(AlertService);
  private readonly dateAdapter = inject(DateAdapter<Date>);
  private readonly datePipe = inject(DatePipe);

  readonly surveyId = input<string>(EMPTY_UUID);

  readonly cancel = output<void>();
  readonly save = output<void>();

  readonly isEditMode = computed(() => this.surveyId() !== EMPTY_UUID);

  // The survey types the user can create: Committee Lead = Branch Survey, person in charge of a branch = Group Survey.
  // When an existing survey is edited the type cannot change.
  readonly surveyTypes = computed(() => {
    if (this.isEditMode()) {
      return [this.formModel().surveyType];
    }
    const types: string[] = [];
    if (this.surveyStore.canCreateBranchSurvey()) types.push('Branch Survey');
    if (this.surveyStore.canCreateGroupSurvey()) types.push('Group Survey');
    return types;
  });
  readonly isGroupSurvey = computed(() => this.formModel().surveyType === 'Group Survey');
  // The people assigned to the survey are called Credit Officers in a Group Survey, Surveyors in a Branch Survey.
  readonly assigneeLabel = computed(() => (this.isGroupSurvey() ? 'Credit Officer' : 'Surveyor'));
  readonly branchName = computed(() =>
    this.isEditMode() ? (this.formModel().branchName ?? '') : (this.surveyStore.inchargeBranchName() ?? ''),
  );

  protected readonly formModel = signal<ISurveyDetail>(this.createEmptyModel());
  readonly isMemberSelected = signal<boolean>(false);
  private createEmptyModel(): ISurveyDetail {
    return {
      id: EMPTY_UUID,
      sequence: 0,
      surveyType: 'Branch Survey',
      assignmentNo: '',
      assignmentDate: new Date(),
      tentativeSubmissionDate: null,
      proposedArea: '',
      administrativeUnitId: '',
      administrativeUnitName: null,
      status: 'Assigned',
      surveyFormAttached: false,
      branchOrganizationUnitId: null,
      previousSurveyId: null,
      canEditGeneral: true,
      canEditForm: false,
      auditInfo: null,
      surveyAssigneds: [],
    };
  }
  readonly surveyAssigneds = computed(() => this.formModel().surveyAssigneds);
  protected updateField<K extends keyof ISurveyDetail>(field: K, value: ISurveyDetail[K]) {
    this.formModel.update((current) => ({
      ...current,

      [field]: value,
    }));
  }
  protected readonly surveySchema: Schema<ISurveyDetail> = schema((path) => {
    required(path.surveyType, {
      message: 'Survey Type is required',
    });

    required(path.assignmentDate, {
      message: 'Assignment Date is required',
    });

    required(path.administrativeUnitId, {
      message: 'Administrative Unit is required',
    });

    required(path.proposedArea, {
      message: 'Proposed Area is required',
    });
    readonly(path.assignmentDate, { when: () => true });
    readonly(path.tentativeSubmissionDate, { when: () => true });
  });
  protected readonly surveyForm = form(this.formModel, this.surveySchema);

  readonly employeeOptions = signal<EmployeeSearchByText[]>([]);

  readonly employeeSearchText = signal('');

  private readonly employeeSearch$ = new Subject<{ searchText: string }>();
  selectedEmployee = signal<EmployeeSearchByText | null>(null);
  constructor() {
    this.dateAdapter.setLocale('en-GB');

    this.employeeSearch$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((x) => this.employeeService.getEmployeesBySearchText(x)),
      )
      .subscribe((resp: any) => {
        this.employeeOptions.set(resp ?? []);
      });

    effect(() => {
      this.surveyStore.setSurveyId(this.surveyId());
    });

    // A new survey starts with the first type the user is allowed to create.
    effect(() => {
      if (this.isEditMode()) return;
      const types = this.surveyTypes();
      if (types.length > 0 && !types.includes(untracked(() => this.formModel().surveyType))) {
        untracked(() => this.onSurveyTypeChange(types[0]));
      }
    });

    effect(() => {
      const survey = this.surveyStore.surveyUnit();

      if (!survey) {
        return;
      }

      this.formModel.set({
        ...survey,

        assignmentDate: new Date(survey.assignmentDate),

        tentativeSubmissionDate: survey.tentativeSubmissionDate
          ? new Date(survey.tentativeSubmissionDate)
          : null,
      });
    });
  }
  readonly isTentativeDateValid = computed(() => {
    const assignment = this.formModel().assignmentDate;

    const tentative = this.formModel().tentativeSubmissionDate;

    if (!tentative) {
      return true;
    }

    return tentative > assignment;
  });
  // A Group Survey belongs to the branch the user is in charge of. Changing the type starts the people list again.
  protected onSurveyTypeChange(type: string) {
    this.formModel.update((current) => ({
      ...current,
      surveyType: type,
      branchOrganizationUnitId: type === 'Group Survey' ? this.surveyStore.inchargeBranchId() : null,
      surveyAssigneds: [],
    }));
    this.employeeOptions.set([]);
    this.employeeSearchText.set('');
    this.selectedEmployee.set(null);
    this.isMemberSelected.set(false);
  }

  // Group Survey: the Credit Officers of the branch are already known, so they are listed and filtered here.
  private creditOfficerOptions(searchText: string): EmployeeSearchByText[] {
    const text = searchText.trim().toLowerCase();
    return this.surveyStore
      .creditOfficers()
      .filter((x) => !text || x.employeeName.toLowerCase().includes(text))
      .map((x) => ({ id: x.id, employeeName: x.employeeName }) as EmployeeSearchByText);
  }

  protected showCreditOfficers() {
    if (this.isGroupSurvey()) {
      this.employeeOptions.set(this.creditOfficerOptions(this.employeeSearchText()));
    }
  }

  // Member Search, Select, Remove And Set As lead
  protected searchEmployees(searchText: string) {
    this.employeeSearchText.set(searchText);

    if (this.isGroupSurvey()) {
      this.employeeOptions.set(this.creditOfficerOptions(searchText));
      if (!searchText.trim()) {
        this.selectedEmployee.set(null);
        this.isMemberSelected.set(false);
      }
      return;
    }

    if (!searchText.trim()) {
      this.employeeOptions.set([]);
      this.employeeSearchText.set('');
      this.selectedEmployee.set(null);
      this.isMemberSelected.set(false);
      return;
    }

    this.employeeSearch$.next({
      searchText,
    });
  }

  protected selectEmployee(event: MatAutocompleteSelectedEvent) {
    const employee = event.option.value as EmployeeSearchByText;

    this.selectedEmployee.set(employee);

    this.employeeSearchText.set(employee.employeeName);
    this.isMemberSelected.set(true);
  }

  displayEmployeeName(employee: EmployeeSearchByText | string | null): string {
    if (!employee) return '';

    return typeof employee === 'string' ? employee : employee.employeeName;
  }

  protected addMember() {
    const employee = this.selectedEmployee();

    if (!employee) {
      this.alertService.error('Oops ....', `Please select a ${this.assigneeLabel().toLowerCase()} before adding.`);
      return;
    }

    const members = [...this.formModel().surveyAssigneds];
    const exists = members.some((x) => x.employeeId === employee.id);

    if (exists) {
      this.alertService.error('Oops ....', `This ${this.assigneeLabel().toLowerCase()} is already added.`);
      this.employeeSearchText.set('');
      this.selectedEmployee.set(null);
      return;
    }

    members.push({
      id: EMPTY_UUID,
      employeeId: employee.id,
      employeeName: employee.employeeName,
      isLead: members.length === 0,
    });

    this.formModel.update((current) => ({
      ...current,
      surveyAssigneds: members,
    }));
    this.isMemberSelected.set(false);
    this.selectedEmployee.set(null);
    this.employeeSearchText.set('');
    this.employeeOptions.set([]);
  }

  protected removeMember(employeeId: string) {
    this.alertService.confirm('Confirmation', `Do you want to remove this ${this.assigneeLabel().toLowerCase()}?`).then((result) => {
      if (result.isConfirmed) {
        let members = this.formModel().surveyAssigneds.filter((x) => x.employeeId !== employeeId);

        // A survey always needs one lead: if the lead was removed, the first surveyor becomes the lead.
        if (members.length > 0 && !members.some((x) => x.isLead)) {
          members = members.map((member, index) => ({ ...member, isLead: index === 0 }));
        }

        this.formModel.update((current) => ({
          ...current,

          surveyAssigneds: members,
        }));
      }
    });
  }

  protected setLead(employeeId: string, checked: boolean): void {
    // A survey always needs exactly one lead. To change the lead, choose another surveyor as lead.
    if (!checked) {
      return;
    }

    this.formModel.update((current) => ({
      ...current,
      surveyAssigneds: current.surveyAssigneds.map((member) => ({
        ...member,
        isLead: member.employeeId === employeeId,
      })),
    }));
  }

  //  Member part Ends

  protected onSubmit() {
    if (!this.surveyForm().valid()) {
      return;
    }

    if (!this.formModel().tentativeSubmissionDate) {
      this.alertService.error('Oops ....', 'Please select the Tentative Submission Date.');
      return;
    }

    if (!this.isTentativeDateValid()) {
      return;
    }

    if (this.formModel().surveyAssigneds.length === 0) {
      this.alertService.error('Oops ....', `Please add at least one ${this.assigneeLabel().toLowerCase()}.`);
      return;
    }

    if (!this.formModel().surveyAssigneds.some((m) => m.isLead)) {
      this.alertService.error('Oops ....', `Please select one ${this.assigneeLabel().toLowerCase()} as lead.`);
      return;
    }

    this.alertService
      .confirm(
        'Confirmation',
        `Do you want to ${this.isEditMode() ? 'update' : 'create'} this survey?`,
      )
      .then((result) => {
      if (result.isConfirmed) {
        const payload: ISurveyDetail = {
          ...this.formModel(),
          assignmentDate:
            this.datePipe.transform(this.formModel().assignmentDate, 'yyyy-MM-dd') || '',

          tentativeSubmissionDate: this.formModel().tentativeSubmissionDate
            ? this.datePipe.transform(this.formModel().tentativeSubmissionDate, 'yyyy-MM-dd')
            : null,
        };

        if (!this.isEditMode()) {
          this.surveyService.create(payload).subscribe({
            next: (resp: any) => {
              this.alertService.success('Success', resp).then(() => {
                this.surveyStore.refreshList();
                this.save.emit();
              });
            },
          });
          return;
        }

        this.surveyService.update(payload).subscribe({
          next: (resp: any) => {
            this.alertService.success('Success', resp).then(() => {
              this.surveyStore.refreshList();
              this.surveyStore.refreshDetail();
              this.save.emit();
            });
          },
        });
      }
    });
  }
  protected onCancelClicked() {
    this.cancel.emit();
  }
}
