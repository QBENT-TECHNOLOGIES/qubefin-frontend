import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
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
import { form, required, Schema, schema } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { LucideDynamicIcon } from '@lucide/angular';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import Swal from 'sweetalert2';
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
  readonly surveyTypes = signal<string[]>(['Branch Survey', 'Group Survey', 'Regional Survey']);
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

  protected readonly formModel = signal<ISurveyDetail>(this.createEmptyModel());
  readonly isMemberSelected = signal<boolean>(false);
  private createEmptyModel(): ISurveyDetail {
    return {
      id: EMPTY_UUID,
      sequence: 0,
      surveyType: '',
      assignmentNo: '',
      assignmentDate: new Date(),
      tentativeSubmissionDate: null,
      proposedArea: '',
      administrativeUnitId: '',
      administrativeUnitName: null,
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
  // Member Search, Select, Remove And Set As lead
  protected searchEmployees(searchText: string) {
    this.employeeSearchText.set(searchText);

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
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Please select a member before add!',
      });
      return;
    }

    const members = [...this.formModel().surveyAssigneds];
    const exists = members.some((x) => x.employeeId === employee.id);

    if (exists) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Member is already added!',
      });
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
    Swal.fire({
      title: 'Are you sure?',
      text: 'You want to remove this member!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes',
    }).then((result) => {
      if (result.isConfirmed) {
        let members = this.formModel().surveyAssigneds.filter((x) => x.employeeId !== employeeId);

        // if (members.length > 0 && !members.some((x) => x.isLead)) {
        //   members[0].isLead = true;
        // }

        this.formModel.update((current) => ({
          ...current,

          surveyAssigneds: members,
        }));
      }
    });
  }

  protected setLead(employeeId: string, checked: boolean): void {
    this.formModel.update((current) => ({
      ...current,
      surveyAssigneds: current.surveyAssigneds.map((member) =>
        member.employeeId === employeeId ? { ...member, isLead: checked } : member,
      ),
    }));
  }

  //  Member part Ends

  protected onSubmit() {
    if (!this.surveyForm().valid()) {
      return;
    }

    if (!this.isTentativeDateValid()) {
      return;
    }

    if (this.formModel().surveyAssigneds.length === 0) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Please select at least one members.',
      });
      return;
    }

    if (!this.formModel().surveyAssigneds.some((m) => m.isLead)) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Please select atleast one member as lead.',
      });
      return;
    }

    Swal.fire({
      title: 'Are you sure?',
      text: `You want to ${this.isEditMode() ? 'update' : 'create'} this survey!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes',
    }).then((result) => {
      if (result.isConfirmed) {
        const payload: ISurveyDetail = {
          ...this.formModel(),
          assignmentNo: this.generateAssignmentNo(),
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
  generateAssignmentNo(): string {
    const number = Math.floor(100000 + Math.random() * 900000);
    return `ASG${number}`;
  }
  protected onCancelClicked() {
    this.cancel.emit();
  }
}
