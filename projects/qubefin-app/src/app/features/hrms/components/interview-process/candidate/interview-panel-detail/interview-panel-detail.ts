import { Component, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { form, FormField, required, schema, Schema } from '@angular/forms/signals';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { EMPTY_UUID, AlertService, TimePickerDialogComponent } from 'qubefin-core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

export interface IScheduleModel {
  candidateId: string;
  scheduledDate: string;
  scheduledTime: string;
  hodEmployeeId: string;
  directorEmployeeId: string;
  anyEmployeeId: string;
  hrHodEmployeeId: string;
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

import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { InterviewPanelService } from '../../../../services/interview-panel-service';
import { InterviewPanelStore } from '../../../../stores/interview-panel-store';
import { EmployeeService } from '../../../../services/employee-service';
import { EmployeeSearchByText } from '../../../../models/employee-search-by-text';

@Component({
  selector: 'qfin-interview-panel-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
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
  private readonly employeeService = inject(EmployeeService);
  private readonly dateAdapter = inject(DateAdapter<Date>);
  private readonly datePipe = inject(DatePipe);

  hodSearchControl = new FormControl('');
  directorSearchControl = new FormControl('');
  anySearchControl = new FormControl('');
  hrHodSearchControl = new FormControl('');

  readonly employeeOptions = signal<EmployeeSearchByText[]>([]);
  private readonly employeeSearch$ = new Subject<string>();

  candidates = signal<any[]>([]);
  candidateSearchControl = new FormControl('');

  readonly panelId = input<string>(EMPTY_UUID);
  readonly isAssessmentMode = input<boolean>(false);
  readonly candidateIdForPanel = input<string>('9a7c7f5a-5a41-4e3d-9b4e-123456789abc');

  readonly cancel = output<void>();
  readonly save = output<void>();

  // --- Schedule Panel Form ---
  protected readonly scheduleModel = signal<IScheduleModel>({
    candidateId: '',
    scheduledDate: '',
    scheduledTime: '',
    hodEmployeeId: '',
    directorEmployeeId: '',
    anyEmployeeId: '',
    hrHodEmployeeId: '',
  });

  protected readonly scheduleSchema: Schema<IScheduleModel> = schema((path) => {
    required(path.candidateId, { message: 'Candidate is required' });
    required(path.scheduledDate, { message: 'Scheduled Date is required' });
    required(path.scheduledTime, { message: 'Scheduled Time is required' });
    required(path.hodEmployeeId, { message: 'HOD is required' });
    required(path.directorEmployeeId, { message: 'Director is required' });
    required(path.anyEmployeeId, { message: 'Member is required' });
    required(path.hrHodEmployeeId, { message: 'HR HOD is required' });
  });

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

  protected readonly assessmentSchema: Schema<IAssessmentModel> = schema((path) => {
    // Optionally we can add required validators, but often ratings default to 0.
  });

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
          scheduledDate: '',
          scheduledTime: '',
          hodEmployeeId: '',
          directorEmployeeId: '',
          anyEmployeeId: '',
          hrHodEmployeeId: '',
        });
      }
    });

    this.employeeSearch$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((searchText) => this.employeeService.getEmployeesBySearchText({ searchText })),
      )
      .subscribe((response) => {
        this.employeeOptions.set((response as EmployeeSearchByText[]) ?? []);
      });

    [
      this.hodSearchControl,
      this.directorSearchControl,
      this.anySearchControl,
      this.hrHodSearchControl,
    ].forEach((control) => {
      control.valueChanges.subscribe((value) => {
        if (typeof value === 'string' && !this.isUUID(value)) {
          this.searchEmployees(value);
        }
      });
    });

    this.candidateSearchControl.valueChanges.subscribe((value) => {
      if (value && this.isUUID(value)) return;
      this.searchCandidates(value || '');
    });
    this.searchCandidates('');
  }

  isUUID(str: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  searchCandidates(searchText: string) {
    this.panelService.searchCandidates(searchText).subscribe({
      next: (res) => {
        this.candidates.set(res.items || res.data || res);
      },
    });
  }

  displayCandidateName = (candidateId: string): string => {
    if (!candidateId) return '';
    const candidate = this.candidates().find((c) => c.id === candidateId);
    if (candidate) {
      return candidate.displayName || '';
    }
    return candidateId;
  };

  displayEmployeeName = (employeeId: string): string => {
    if (!employeeId) return '';
    const emp = this.employeeOptions().find((e) => e.id === employeeId);
    if (emp) {
      return `${emp.employeeName || ''}`.trim();
    }
    return employeeId;
  };

  searchEmployees(searchText: string) {
    if (!searchText.trim()) {
      this.employeeOptions.set([]);
      return;
    }

    this.employeeSearch$.next(searchText);
  }

  onCandidateSelected(event: any) {
    this.scheduleModel.update((m) => ({ ...m, candidateId: event.option.value }));
  }

  onPanelistSelected(field: keyof IScheduleModel, event: any) {
    this.scheduleModel.update((m) => ({ ...m, [field]: event.option.value }));
  }

  onCancel() {
    this.cancel.emit();
  }

  openTimePicker() {
    let currentHour = 12;
    let currentMinute = 0;
    let currentPeriod: 'AM' | 'PM' = 'AM';

    const currentTime = this.scheduleForm().value().scheduledTime;
    if (currentTime) {
      const parts = currentTime.split(' ');
      const timeParts = parts[0].split(':');
      currentHour = parseInt(timeParts[0], 10) || 12;
      currentMinute = parseInt(timeParts[1], 10) || 0;
      if (parts[1]) {
        currentPeriod = parts[1].toUpperCase() as 'AM' | 'PM';
      }
    }

    const dialogRef = this.dialog.open(TimePickerDialogComponent, {
      width: '400px',
      data: {
        title: 'Scheduled Time',
        initialHour: currentHour,
        initialMinute: currentMinute,
        initialPeriod: currentPeriod,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const timeStr = `${result.hour.toString().padStart(2, '0')}:${result.minute
          .toString()
          .padStart(2, '0')} ${result.period}`;
        this.scheduleModel.update((m) => ({ ...m, scheduledTime: timeStr }));
      }
    });
  }

  onSubmitSchedule() {
    this.scheduleForm().markAsTouched();
    if (!this.scheduleForm().valid()) return;

    const formValue = this.scheduleForm().value();
    const commonSchedule = {
      scheduledDate: this.datePipe.transform(formValue.scheduledDate, 'yyyy-MM-dd'),
      scheduledTime: this.normalizeTimeValue(formValue.scheduledTime),
    };

    const scheduleData = {
      candidateId: formValue.candidateId,
      panelists: [
        { employeeId: formValue.hodEmployeeId, ...commonSchedule },
        { employeeId: formValue.directorEmployeeId, ...commonSchedule },
        { employeeId: formValue.anyEmployeeId, ...commonSchedule },
        { employeeId: formValue.hrHodEmployeeId, ...commonSchedule },
      ].filter((p) => p.employeeId),
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
}
