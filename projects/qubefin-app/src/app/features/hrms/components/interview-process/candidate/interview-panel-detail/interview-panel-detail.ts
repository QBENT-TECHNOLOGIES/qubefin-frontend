import { Component, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { form, FormField, schema, Schema } from '@angular/forms/signals';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { EMPTY_UUID, AlertService, ApiPaths } from 'qubefin-core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';

export interface IScheduleModel {
  candidateId: string;
}

export interface IAssessmentModel {
  appearanceAttitudeRating: number;
  appearanceAttitudeRemarks: string;
  personalityRating: number;
  personalityRemarks: string;
  communicationRating: number;
  communicationRemarks: string;
  educationRating: number;
  educationRemarks: string;
  workExperienceRating: number;
  workExperienceRemarks: string;
  technicalCompetenceRating: number;
  technicalCompetenceRemarks: string;
  flexibilityRating: number;
  flexibilityRemarks: string;
  ambitionRating: number;
  ambitionRemarks: string;
  potentialRating: number;
  potentialRemarks: string;
  othersRating: number;
  othersRemarks: string;
  anyOtherJobsSuitedRemarks: string;
  isRecommendedForPosition: boolean;
  positiveRemarks: string;
  negativeRemarks: string;
}

import { InterviewPanelService } from '../../../../services/interview-panel-service';
import { InterviewPanelStore } from '../../../../stores/interview-panel-store';
import { OrganizationUnitTypeStore } from '../../../../../global/stores/organization-unit-type-store';
import { OrganizationUnitService } from '../../../../../global/services/organization-unit-service';
import { OrganizationUnit } from '../../../../../global/models/organization-unit';

import { EmployeeStore } from '../../../../stores/employee-store';

@Component({
  selector: 'qfin-interview-panel-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatAutocompleteModule,
    MatDatepickerModule,
    MatNativeDateModule,
    ReactiveFormsModule,
    LucideDynamicIcon,
    FormField,
    MatDialogModule,
  ],
  providers: [provideNativeDateAdapter(), DatePipe],
  templateUrl: './interview-panel-detail.html',
})
export class InterviewPanelDetail {
  private readonly panelService = inject(InterviewPanelService);
  private readonly alertService = inject(AlertService);
  private readonly panelStore = inject(InterviewPanelStore);
  private readonly dialog = inject(MatDialog);
  private readonly dateAdapter = inject(DateAdapter<Date>);
  private readonly datePipe = inject(DatePipe);
  private readonly organizationUnitTypeStore = inject(OrganizationUnitTypeStore);
  private readonly organizationUnitService = inject(OrganizationUnitService);
  private readonly employeeStore = inject(EmployeeStore);

  readonly organizationUnitTypes = this.organizationUnitTypeStore.organizationUnitTypes;
  organizationUnits = signal<OrganizationUnit[]>([]);
  readonly employeeList = this.employeeStore.employeesByOrgUnit;
  selectedPanelists = signal<any[]>([]);

  organizationUnitTypeId = new FormControl('');
  organizationUnitId = new FormControl('');

  readonly panelId = input<string>(EMPTY_UUID);
  readonly isAssessmentMode = input<boolean>(false);
  readonly candidateIdForPanel = input<string>('9a7c7f5a-5a41-4e3d-9b4e-123456789abc');
  readonly interviewDate = input<string>('');
  readonly interviewTime = input<string>('');

  readonly cancel = output<void>();
  readonly save = output<void>();

  // --- Schedule Panel Form ---
  protected readonly scheduleModel = signal<IScheduleModel>({
    candidateId: '',
  });

  protected readonly scheduleSchema: Schema<IScheduleModel> = schema((path) => {});

  protected readonly scheduleForm = form(this.scheduleModel, this.scheduleSchema);

  // --- Assessment Form ---
  protected readonly assessmentModel = signal<IAssessmentModel>({
    appearanceAttitudeRating: 0,
    appearanceAttitudeRemarks: '',
    personalityRating: 0,
    personalityRemarks: '',
    communicationRating: 0,
    communicationRemarks: '',
    educationRating: 0,
    educationRemarks: '',
    workExperienceRating: 0,
    workExperienceRemarks: '',
    technicalCompetenceRating: 0,
    technicalCompetenceRemarks: '',
    flexibilityRating: 0,
    flexibilityRemarks: '',
    ambitionRating: 0,
    ambitionRemarks: '',
    potentialRating: 0,
    potentialRemarks: '',
    othersRating: 0,
    othersRemarks: '',
    anyOtherJobsSuitedRemarks: '',
    isRecommendedForPosition: true,
    positiveRemarks: '',
    negativeRemarks: '',
  });

  protected readonly assessmentSchema: Schema<IAssessmentModel> = schema((path) => {});

  protected readonly assessmentForm = form(this.assessmentModel, this.assessmentSchema);

  constructor() {
    this.dateAdapter.setLocale('en-GB');
    effect(() => {
      const id = this.panelId();
      if (!this.isAssessmentMode() && id === EMPTY_UUID) {
        this.scheduleModel.set({
          candidateId:
            this.candidateIdForPanel() && this.candidateIdForPanel() !== EMPTY_UUID
              ? this.candidateIdForPanel()
              : '',
        });
      }
    });

    this.organizationUnitTypeId.valueChanges.subscribe((typeId) => {
      if (typeId) {
        this.onOrganizationUnitTypeChange(typeId);
      } else {
        this.organizationUnits.set([]);
        this.employeeStore.setSearchOrganizationUnitId(null);
      }
    });

    this.organizationUnitId.valueChanges.subscribe((orgId) => {
      if (orgId) {
        this.onOrganizationUnitChange(orgId);
      } else {
        this.employeeStore.setSearchOrganizationUnitId(null);
      }
    });
  }

  onOrganizationUnitTypeChange(typeId: string) {
    if (!typeId || typeId === EMPTY_UUID) return;
    this.organizationUnitService.getOrganizationUnitByType(typeId).subscribe({
      next: (res: any) => {
        this.organizationUnits.set(res);
        this.organizationUnitId.setValue('');
      },
    });
  }

  onOrganizationUnitChange(orgId: string) {
    if (!orgId || orgId === EMPTY_UUID) {
      this.employeeStore.setSearchOrganizationUnitId(null);
      return;
    }

    this.employeeStore.setSearchOrganizationUnitId(orgId);
  }

  togglePanelist(employee: any, isChecked: boolean) {
    const current = this.selectedPanelists();
    if (isChecked) {
      if (!current.find((e) => e.id === employee.id)) {
        this.selectedPanelists.set([...current, employee]);
      }
    } else {
      this.selectedPanelists.set(current.filter((e) => e.id !== employee.id));
    }
  }

  isPanelistSelected(employeeId: string): boolean {
    return !!this.selectedPanelists().find((e) => e.id === employeeId);
  }

  onCancel() {
    this.cancel.emit();
  }

  onSubmitSchedule() {
    this.scheduleForm().markAsTouched();
    if (!this.scheduleForm().valid()) return;

    if (this.selectedPanelists().length === 0) {
      this.alertService.error('Error', 'Please select at least one panelist.');
      return;
    }

    const formValue = this.scheduleForm().value();

    // Format internal date and time
    const interviewDateRaw = this.interviewDate();
    const formattedDate = interviewDateRaw
      ? this.datePipe.transform(interviewDateRaw, 'yyyy-MM-dd')
      : null;
    console.log(this.interviewTime());
    const formattedTime = this.normalizeTimeValue(this.interviewTime());

    const commonSchedule = {
      scheduledDate: formattedDate,
      scheduledTime: formattedTime,
    };

    const scheduleData = {
      candidateId: formValue.candidateId,
      panelists: this.selectedPanelists().map((emp) => ({
        employeeId: emp.id,
        ...commonSchedule,
      })),
    };

    (this.panelService.schedulePanel(scheduleData) as any).subscribe({
      next: () => {
        this.alertService.success('Success', 'Panel Scheduled').then(() => {
          this.panelStore.refreshPanels();
          this.save.emit();
        });
      },
      error: () => this.alertService.error('Error', 'Failed to schedule panel'),
    });
  }

  onSubmitAssessment() {
    this.assessmentForm().markAsTouched();
    if (!this.assessmentForm().valid()) return;

    const assessmentData = {
      panelId: this.panelId(),
      ...this.assessmentForm().value(),
    };

    (this.panelService.submitAssessment(assessmentData) as any).subscribe({
      next: () => {
        this.alertService.success('Success', 'Assessment Submitted').then(() => {
          this.panelStore.refreshPanels();
          this.save.emit();
        });
      },
      error: () => this.alertService.error('Error', 'Failed to submit assessment'),
    });
  }
  private normalizeTimeValue(value: string | Date | null): string | null {
    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      const normalizedValue = value.trim().replace(/\./g, ':');

      // Handle 12-hour format: 10:30 AM / 02:30 PM
      if (/\b(AM|PM)\b/i.test(normalizedValue)) {
        const parts = normalizedValue.split(/\s+/);
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
      const timeParts = normalizedValue.split(':');

      const hour = String(timeParts[0]).padStart(2, '0');
      const minute = String(timeParts[1] ?? '0').padStart(2, '0');
      const second = String(timeParts[2] ?? '0').padStart(2, '0');

      return `${hour}:${minute}:${second}`;
    }

    // Date object
    return this.datePipe.transform(value, 'HH:mm:ss') ?? null;
  }
}
