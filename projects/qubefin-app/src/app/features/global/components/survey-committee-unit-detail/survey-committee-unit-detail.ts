import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { form, FormField, required, schema, Schema } from '@angular/forms/signals';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { SurveyCommitteeItem } from '../../models/survey-committee-item';
import { EMPTY_UUID } from 'qubefin-core';
import { SurveyCommitteeStore } from '../../stores/survey-committee-store';
import { SurveyCommitteeService } from '../../services/survey-committee-service';
import { LucideDynamicIcon } from '@lucide/angular';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { EmployeeSearchByText } from '../../../hrms/models/employee-search-by-text';
import { EmployeeService } from '../../../hrms/services/employee-service';

interface EmployeeSearchResponse {
  value?: {
    employees?: EmployeeSearchByText[];
  };
  valueOrDefault?: {
    employees?: EmployeeSearchByText[];
  };
  employees?: EmployeeSearchByText[];
}

@Component({
  selector: 'qfin-survey-committee-unit-detail',
  imports: [
    CommonModule,
    MatAutocompleteModule,
    FormField,
    MatFormFieldModule,
    MatCheckboxModule,
    MatIconModule,
    MatInputModule,
    LucideDynamicIcon,
    MatDatepickerModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './survey-committee-unit-detail.html',
  styles: ``,
})
export class SurveyCommitteeUnitDetail {
  private readonly surveyCommitteeStore = inject(SurveyCommitteeStore);
  private readonly surveyCommitteeService = inject(SurveyCommitteeService);
  private readonly employeeService = inject(EmployeeService);

  private readonly dateAdapter = inject(DateAdapter<Date>);

  readonly committeeMemberId = input<string>(EMPTY_UUID);
  readonly cancel = output<void>();
  readonly save = output<void>();
  readonly isEditMode = computed(
    () => !!this.committeeMemberId() && this.committeeMemberId() !== EMPTY_UUID,
  );
  readonly iconMap = APP_ICONS_MAP;
  readonly committeeMember = this.surveyCommitteeStore.surveyCommitteeUnit;
  readonly loading = this.surveyCommitteeStore.surveyCommitteeUnitLoading;
  readonly employeeOptions = signal<EmployeeSearchByText[]>([]);
  readonly employeeSearchText = signal('');
  private readonly employeeSearch$ = new Subject<{ searchText: string }>();

  protected readonly formModel = signal<SurveyCommitteeItem>(this.createEmptyModel());
  protected readonly surveyCommitteeSchema: Schema<SurveyCommitteeItem> = schema((path) => {
    required(path.employeeId, { message: 'Employee ID is required' });
    required(path.assignedFrom, { message: 'Assigned From is required' });
    required(path.assignedTo, { message: 'Assigned To is required' });
  });
  protected readonly surveyCommitteeForm = form(this.formModel, this.surveyCommitteeSchema);

  constructor() {
    this.dateAdapter.setLocale('en-GB');
    this.employeeSearch$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((searchText) => this.employeeService.getEmployeesBySearchText(searchText)),
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
      this.surveyCommitteeStore.setSurveyCommitteeId(this.committeeMemberId());

      if (!this.isEditMode()) {
        this.formModel.set(this.createEmptyModel());
        this.employeeSearchText.set('');
        this.employeeOptions.set([]);
        return;
      }

      const member = this.committeeMember();
      if (member) {
        this.formModel.set({
          ...member,
          assignedFrom: member.assignedFrom ? new Date(member.assignedFrom) : new Date(),
          assignedTo: member.assignedTo ? new Date(member.assignedTo) : new Date(),
        });
        this.employeeSearchText.set(member.employeeName);
      }
    });

    // effect(() => {
    // });
  }

  protected updateField<K extends keyof SurveyCommitteeItem>(
    field: K,
    value: SurveyCommitteeItem[K],
  ) {
    this.formModel.update((current) => ({
      ...current,
      [field]: value,
    }));
  }

  protected updateAssignedFrom(value: string | null) {
    this.updateField('assignedFrom', value ? new Date(value) : new Date());
  }

  protected updateAssignedTo(value: string | null) {
    this.updateField('assignedTo', value ? new Date(value) : new Date());
  }

  protected searchEmployees(searchText: string) {
    if (this.isEditMode()) {
      return;
    }

    this.employeeSearchText.set(searchText);

    if (!searchText.trim()) {
      this.updateField('employeeId', '');
      this.updateField('employeeName', '');
      this.employeeOptions.set([]);
      return;
    }

    let text = { searchText: searchText };
    this.employeeSearch$.next(text);
  }

  protected selectEmployee(event: MatAutocompleteSelectedEvent) {
    const employee = event.option.value as EmployeeSearchByText;
    this.employeeSearchText.set(employee.employeeName);
    this.updateField('employeeId', employee.id);
    this.updateField('employeeName', employee.employeeName);
  }

  protected displayEmployeeName(employee: EmployeeSearchByText | string | null): string {
    if (!employee) {
      return '';
    }

    return typeof employee === 'string' ? employee : employee.employeeName;
  }

  protected onCancelClicked() {
    this.cancel.emit();
  }

  protected onSubmit() {
    if (!this.surveyCommitteeForm().valid()) {
      return;
    }

    const dataToSave = this.surveyCommitteeForm().value();

    if (!dataToSave.employeeId?.trim()) {
      return;
    }

    if (!this.isEditMode()) {
      this.surveyCommitteeService.create(dataToSave).subscribe({
        next: () => {
          this.surveyCommitteeStore.refreshList();
          this.save.emit();
        },
      });
      return;
    }

    this.surveyCommitteeService.update(dataToSave).subscribe({
      next: () => {
        this.surveyCommitteeStore.refreshList();
        this.surveyCommitteeStore.refreshDetail();
        this.save.emit();
      },
    });
  }

  private createEmptyModel(): SurveyCommitteeItem {
    return {
      id: EMPTY_UUID,
      employeeId: '',
      employeeName: '',
      isLead: false,
      isActive: true,
      assignedFrom: new Date(),
      assignedTo: new Date(),
    };
  }
}
