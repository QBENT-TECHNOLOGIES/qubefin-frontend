import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { SurveyStore } from '../../../stores/survey-store';
import { SurveyService } from '../../../services/survey-service';
import { EmployeeService } from '../../../../hrms/services/employee-service';
import { AdministrativeUnitService } from '../../../services/administrative-unit-service';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { CommonModule, DatePipe } from '@angular/common';
import { EMPTY_UUID } from 'qubefin-core';
import { ISurveyDetail } from '../../../models/survey';
import {
  EmployeeSearchByText,
  EmployeeSearchResponse,
} from '../../../../hrms/models/employee-search-by-text';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { form, FormField, required, Schema, schema } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { LucideDynamicIcon } from '@lucide/angular';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';

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
  ],
  providers: [provideNativeDateAdapter(), DatePipe],
  templateUrl: './survey-unit-detail.html',
  styles: ``,
})
export class SurveyUnitDetail {
  private readonly surveyStore = inject(SurveyStore);
  private readonly surveyService = inject(SurveyService);
  private readonly employeeService = inject(EmployeeService);
  private readonly administrativeUnitService = inject(AdministrativeUnitService);
  private readonly dateAdapter = inject(DateAdapter<Date>);
  private readonly datePipe = inject(DatePipe);

  readonly surveyId = input<string>(EMPTY_UUID);

  readonly cancel = output<void>();
  readonly save = output<void>();

  readonly isEditMode = computed(() => this.surveyId() !== EMPTY_UUID);

  protected readonly formModel = signal<ISurveyDetail>(this.createEmptyModel());
  private createEmptyModel(): ISurveyDetail {
    return {
      id: EMPTY_UUID,
      sequence: 0,
      surveyType: '',
      assignmentNo: '',
      assignmentDate: new Date(),
      tentativeSubmissionDate: null,
      proposedArea: '',
      countryId: '',
      stateId: '',
      districtId: '',
      administrativeUnitId: '',
      administrativeUnitName: null,
      surveyMembers: [],
    };
  }

  // DEMO Data ----- Start
  readonly surveyTypes = signal<string[]>(['Branch Survey', 'Group Survey', 'Regional Survey']);

  readonly countries = signal([{ id: '1', name: 'India' }]);

  readonly states = signal([
    { id: '1', name: 'West Bengal' },
    { id: '2', name: 'Odisha' },
  ]);

  readonly districts = signal([
    { id: '1', name: 'Kolkata' },
    { id: '2', name: 'North 24 Parganas' },
  ]);

  readonly administrativeUnits = signal([
    {
      id: '1',
      name: 'Baranagar Administrative Unit',
    },
    {
      id: '2',
      name: 'Salt Lake Administrative Unit',
    },
  ]);
  // DEMO Data ----- End
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
      .subscribe((response: EmployeeSearchResponse) => {
        this.employeeOptions.set(
          response.value?.employees ??
            response.valueOrDefault?.employees ??
            response.employees ??
            [],
        );
      });

    effect(() => {
      this.surveyStore.setSurveyId(this.surveyId());
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
  protected searchEmployees(searchText: string) {
    this.employeeSearchText.set(searchText);

    if (!searchText.trim()) {
      this.employeeOptions.set([]);

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
  }

  displayEmployeeName(employee: EmployeeSearchByText | string | null): string {
    if (!employee) return '';

    return typeof employee === 'string' ? employee : employee.employeeName;
  }

  protected addMember() {
    const employee = this.selectedEmployee();

    if (!employee) {
      return;
    }

    const members = [...this.formModel().surveyMembers];

    const exists = members.some((x) => x.employeeId === employee.id);

    if (exists) {
      return;
    }

    members.push({
      employeeId: employee.id,
      name: employee.employeeName,
      isLead: members.length === 0,
    });

    this.formModel.update((current) => ({
      ...current,
      surveyMembers: members,
    }));

    this.selectedEmployee.set(null);

    this.employeeSearchText.set('');

    this.employeeOptions.set([]);
  }
  protected removeMember(employeeId: string) {
    let members = this.formModel().surveyMembers.filter((x) => x.employeeId !== employeeId);

    if (members.length > 0 && !members.some((x) => x.isLead)) {
      members[0].isLead = true;
    }

    this.formModel.update((current) => ({
      ...current,

      surveyMembers: members,
    }));
  }
  protected setLead(employeeId: string) {
    const members = this.formModel().surveyMembers.map((member) => ({
      ...member,

      isLead: member.employeeId === employeeId,
    }));

    this.formModel.update((current) => ({
      ...current,

      surveyMembers: members,
    }));
  }
  readonly surveyMembers = computed(() => this.formModel().surveyMembers);
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

    required(path.countryId, {
      message: 'Country is required',
    });

    required(path.stateId, {
      message: 'State is required',
    });

    required(path.districtId, {
      message: 'District is required',
    });

    required(path.administrativeUnitId, {
      message: 'Administrative Unit is required',
    });

    required(path.proposedArea, {
      message: 'Proposed Area is required',
    });
  });
  protected readonly surveyForm = form(this.formModel, this.surveySchema);
  protected onCancelClicked() {
    this.cancel.emit();
  }

  protected onSubmit() {
    if (!this.surveyForm().valid()) {
      return;
    }

    if (!this.isTentativeDateValid()) {
      return;
    }

    if (this.formModel().surveyMembers.length === 0) {
      return;
    }
    const payload = {
      ...this.formModel(),

      assignmentDate: this.datePipe.transform(this.formModel().assignmentDate, 'yyyy-MM-dd'),

      tentativeSubmissionDate: this.formModel().tentativeSubmissionDate
        ? this.datePipe.transform(this.formModel().tentativeSubmissionDate, 'yyyy-MM-dd')
        : null,
    };

    console.log(payload);
  }
}
