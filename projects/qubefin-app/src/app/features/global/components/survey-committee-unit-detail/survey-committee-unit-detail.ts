import { CommonModule, DatePipe } from '@angular/common';
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
  providers: [provideNativeDateAdapter(), DatePipe],
  templateUrl: './survey-committee-unit-detail.html',
  styles: ``,
})
export class SurveyCommitteeUnitDetail {
  // ===========================
  // Dependency Injection
  // ===========================
  private readonly surveyCommitteeStore = inject(SurveyCommitteeStore);
  private readonly surveyCommitteeService = inject(SurveyCommitteeService);
  private readonly employeeService = inject(EmployeeService);

  private readonly dateAdapter = inject(DateAdapter<Date>);
  private readonly datePipe = inject(DatePipe);
  // ===========================
  // Inputs & Outputs
  // ===========================
  readonly committeeMemberId = input<string>(EMPTY_UUID);

  readonly cancel = output<void>();
  readonly save = output<void>();
  // ===========================
  // Component State
  // ===========================
  readonly isEditMode = computed(
    () => !!this.committeeMemberId() && this.committeeMemberId() !== EMPTY_UUID,
  );
  readonly iconMap = APP_ICONS_MAP;
  // ===========================
  // Store Data
  // ===========================
  readonly committeeMember = this.surveyCommitteeStore.surveyCommitteeUnit;
  readonly loading = this.surveyCommitteeStore.surveyCommitteeUnitLoading;
  // ===========================
  // Employee Search
  // ===========================
  readonly employeeOptions = signal<EmployeeSearchByText[]>([]);
  readonly employeeSearchText = signal('');
  private readonly employeeSearch$ = new Subject<{ searchText: string }>();
  // ===========================
  // Form
  // ===========================
  protected readonly formModel = signal<SurveyCommitteeItem>(this.createEmptyModel());
  protected readonly surveyCommitteeSchema: Schema<SurveyCommitteeItem> = schema((path) => {
    required(path.employeeId, {
      message: 'Employee ID is required',
    });

    if (!this.formModel().isActive) {
      required(path.assignedTo, {
        message: 'Assigned To is required',
      });
    }
  });
  protected readonly surveyCommitteeForm = form(this.formModel, this.surveyCommitteeSchema);

  constructor() {
    // ===========================
    // Configure Date Adapter
    // ===========================
    this.dateAdapter.setLocale('en-GB');
    // ===========================
    // Employee Search Pipeline
    // ===========================
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
    // ===========================
    // Load Member / Reset Form
    // ===========================
    effect(() => {
      this.surveyCommitteeStore.setSurveyCommitteeId(this.committeeMemberId());

      if (!this.isEditMode()) {
        this.formModel.set(this.createEmptyModel());
        this.employeeSearchText.set('');
        this.employeeOptions.set([]);
        return;
      }
    });
    // ===========================
    // Business Rules
    // ===========================
    effect(() => {
      if (!this.isEditMode()) {
        return;
      }

      const { isActive, isLead, assignedTo } = this.formModel();

      const updates: Partial<SurveyCommitteeItem> = {};

      if (!isActive) {
        // Member is becoming inactive
        if (isLead) {
          updates.isLead = false;
        }

        // Keep assignedTo for user to select.
        // If you want today's date automatically:
        // if (!assignedTo) {
        //   updates.assignedTo = new Date();
        // }
      } else {
        // Member is active
        if (assignedTo !== null) {
          updates.assignedTo = null;
        }
      }

      if (Object.keys(updates).length) {
        this.formModel.update((current) => ({
          ...current,
          ...updates,
        }));
      }
    });
    // ===========================
    // Populate Form
    // ===========================
    effect(() => {
      const member = this.committeeMember();
      if (member) {
        this.formModel.set({
          ...member,
          assignedTo: member.assignedTo ? new Date(member.assignedTo) : null,
        });
        this.employeeSearchText.set(member.employeeName);
      }
    });
  }
  // ===========================
  // Form Helpers
  // ===========================
  protected updateField<K extends keyof SurveyCommitteeItem>(
    field: K,
    value: SurveyCommitteeItem[K],
  ) {
    this.formModel.update((current) => ({
      ...current,
      [field]: value,
    }));
  }
  // ===========================
  // Employee Search Actions
  // ===========================
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
  // ===========================
  // Form Actions
  // ===========================
  protected onCancelClicked() {
    this.cancel.emit();
  }
  protected onSubmit() {
    if (!this.surveyCommitteeForm().valid()) {
      return;
    }

    const dataToSave = this.surveyCommitteeForm().value();
    const payLoad = {
      id: dataToSave.id,
      isActive: dataToSave.isActive,
      isLead: dataToSave.isLead,
      assignedTo: dataToSave.isActive
        ? null
        : this.datePipe.transform(dataToSave.assignedTo, 'yyyy-MM-dd') || '',
    };

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

    this.surveyCommitteeService.update(payLoad).subscribe({
      next: () => {
        this.surveyCommitteeStore.refreshList();
        this.surveyCommitteeStore.refreshDetail();
        this.save.emit();
      },
    });
  }
  // ===========================
  // Helpers
  // ===========================
  private createEmptyModel(): SurveyCommitteeItem {
    return {
      id: EMPTY_UUID,
      employeeId: '',
      employeeName: '',
      isLead: false,
      isActive: true,
      assignedFrom: null,
      assignedTo: null,
    };
  }
}
