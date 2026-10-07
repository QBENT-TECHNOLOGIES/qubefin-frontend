import { Component, inject, input, output, signal, OnInit, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { EMPTY_UUID, AlertService, ApiPaths } from 'qubefin-core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { HrmsReportService } from '../../../../../Report/Service/hrms-report-service';

import { InterviewPanelService } from '../../../../services/interview-panel-service';
import { InterviewPanelStore } from '../../../../stores/interview-panel-store';
import { OrganizationUnitTypeStore } from '../../../../../global/stores/organization-unit-type-store';
import { OrganizationUnitService } from '../../../../../global/services/organization-unit-service';
import { OrganizationUnit } from '../../../../../global/models/organization-unit';
import { toApiTime, toDisplayTime, toLocalDate } from '../../interview-time';

import { EmployeeStore } from '../../../../stores/employee-store';
import { MatTooltipModule } from '@angular/material/tooltip';

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
    MatDialogModule,
    MatTooltipModule,
  ],
  providers: [provideNativeDateAdapter(), DatePipe],
  templateUrl: './interview-panel-detail.html',
})
export class InterviewPanelDetail implements OnInit {
  private readonly panelService = inject(InterviewPanelService);
  private readonly hrReportService = inject(HrmsReportService);
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

  // --- Employee search filter (interactive) ---
  employeeSearchTerm = signal<string>('');
  readonly filteredEmployeeList = computed(() => {
    const term = this.employeeSearchTerm().trim().toLowerCase();
    const list = this.employeeList() ?? [];
    if (!term) return list;
    return list.filter(
      (e: any) =>
        e.name?.toLowerCase().includes(term) ||
        e.code?.toLowerCase().includes(term) ||
        e.currentDesignation?.toLowerCase().includes(term),
    );
  });

  onEmployeeSearchChange(value: string) {
    this.employeeSearchTerm.set(value);
  }

  organizationUnitTypeId = new FormControl('');
  organizationUnitId = new FormControl('');

  readonly isViewMode = input<boolean>(false);
  /** HR / Admin may add or remove panelists (USP_GetInterviewCandidateById.CanModifyPanel). A panelist who has
   * submitted can never be removed. */
  readonly canModifyPanel = input<boolean>(false);
  readonly candidateIdForPanel = input<string>(EMPTY_UUID);
  readonly interviewDate = input<string>('');
  readonly interviewTime = input<string>('');

  panelDetails = signal<any[]>([]);

  /** The interview slot, shown once in the header: the candidate's schedule, else the panel's (all panelists
   * share it). */
  readonly interviewSlotDate = computed(
    () => toLocalDate(this.interviewDate() || this.panelDetails()[0]?.scheduledDate) || null,
  );
  readonly submittedCount = computed(
    () => this.panelDetails().filter((p: any) => p.isSubmitted).length,
  );

  /** One plain-words status per panelist, with its colour. */
  panelStatus(panel: any): { label: string; text: string; dot: string; isAbsent: boolean } {
    if (panel.isSubmitted) {
      return {
        label: 'Submitted',
        text: 'text-emerald-700 dark:text-emerald-400',
        dot: 'bg-emerald-500',
        isAbsent: false,
      };
    }
    if (panel.attenedRemarks && !panel.isAttened) {
      return {
        label: 'Candidate absent',
        text: 'text-rose-700 dark:text-rose-400',
        dot: 'bg-rose-500',
        isAbsent: true,
      };
    }
    if (panel.isAttened) {
      return {
        label: 'Assessing',
        text: 'text-violet-700 dark:text-violet-400',
        dot: 'bg-violet-500',
        isAbsent: false,
      };
    }
    if (panel.isAcknowledged) {
      return {
        label: 'Acknowledged',
        text: 'text-blue-700 dark:text-blue-400',
        dot: 'bg-blue-500',
        isAbsent: false,
      };
    }
    return {
      label: 'Not acknowledged',
      text: 'text-amber-700 dark:text-amber-400',
      dot: 'bg-amber-500',
      isAbsent: false,
    };
  }

  readonly interviewSlotTime = computed(() =>
    toDisplayTime(this.interviewTime() || this.panelDetails()[0]?.scheduledTime),
  );
  loadingPanels = signal<boolean>(false);

  // --- Toggle for "Add More Panelists" section (interactive, collapsed by default) ---
  showAddPanelists = signal<boolean>(false);
  toggleAddPanelists() {
    this.showAddPanelists.update((v) => !v);
  }

  readonly cancel = output<void>();
  readonly save = output<void>();

  getInitials(name: string | undefined | null): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('');
  }

  constructor() {
    this.dateAdapter.setLocale('en-GB');

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

  ngOnInit() {
    if (this.isViewMode() && this.candidateIdForPanel()) {
      this.fetchPanelDetails();
    }
  }

  fetchPanelDetails() {
    this.loadingPanels.set(true);
    (this.panelService.getPanelsByCandidate(this.candidateIdForPanel()) as any).subscribe({
      next: (res: any) => {
        this.panelDetails.set(res || []);
        this.loadingPanels.set(false);
      },
      error: () => {
        this.loadingPanels.set(false);
        this.alertService.error('Error', 'Failed to fetch panel details');
      },
    });
  }

  onDeletePanelist(employeeId: string) {
    this.alertService
      .confirm(null, 'Are you sure you want to remove this panelist?')
      .then((result) => {
        if (result.isConfirmed) {
          const candidateId = this.candidateIdForPanel();

          this.panelService.removePanelist(candidateId, employeeId).subscribe({
            next: () => {
              this.alertService.success('Success', 'Panelist removed');
              this.fetchPanelDetails(); // refresh list
              this.panelStore.refreshPanels();
              this.save.emit();
            },
            error: () => {
              this.alertService.error('Error', 'Failed to remove panelist');
            },
          });
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
    if (this.selectedPanelists().length === 0) {
      this.alertService.error('Error', 'Please select at least one panelist.');
      return;
    }

    // The API puts every panelist on the candidate's scheduled interview slot; these are sent for reference.
    const interviewDateRaw = this.interviewDate();
    const formattedDate = interviewDateRaw
      ? this.datePipe.transform(interviewDateRaw, 'yyyy-MM-dd')
      : null;
    const formattedTime = toApiTime(this.interviewTime());

    const commonSchedule = {
      scheduledDate: formattedDate,
      scheduledTime: formattedTime,
    };

    const panelists = this.selectedPanelists().map((emp) => ({
      employeeId: emp.id,
      ...commonSchedule,
    }));

    // View mode + "Add More Panelists" -> adding to an already-existing panel.
    if (this.isViewMode()) {
      this.onAddPanelists(panelists);
      return;
    }

    const candidateId = this.candidateIdForPanel();
    if (!candidateId || candidateId === EMPTY_UUID) {
      this.alertService.error('Error', 'Candidate is required.');
      return;
    }

    this.withAcknowledgement(candidateId, (acknowledgement) =>
      this.panelService.schedulePanel(candidateId, panelists as any, acknowledgement).subscribe({
        next: (message: any) => {
          this.alertService
            .success('Success', typeof message === 'string' ? message : 'Panel Scheduled')
            .then(() => {
              this.panelStore.refreshPanels();
              this.save.emit();
            });
        },
        error: () => {},
      }),
    );
  }

  /** Fetches the interview panel acknowledgement PDF that the API mails to the panelists. If the report fails,
   * the panel is still saved - the mail just goes without the attachment. */
  private withAcknowledgement(candidateId: string, send: (acknowledgement: Blob | null) => void) {
    (this.hrReportService.getInterviewPanelAcknowledgement(candidateId) as any)
      .pipe(catchError(() => of(null)))
      .subscribe((file: Blob | null) => send(file));
  }

  /** Adds the currently selected employees as panelists on a candidate that already has a panel. */
  onAddPanelists(
    panelists: { employeeId: string; scheduledDate: string | null; scheduledTime: string | null }[],
  ) {
    const candidateId = this.candidateIdForPanel();

    this.withAcknowledgement(candidateId, (acknowledgement) =>
      this.panelService.addPanelists(candidateId, panelists as any, acknowledgement).subscribe({
        next: (message: any) => {
          this.alertService
            .success('Success', typeof message === 'string' ? message : 'Panelist(s) added')
            .then(() => {
              this.selectedPanelists.set([]);
              this.showAddPanelists.set(false);
              this.fetchPanelDetails();
              this.panelStore.refreshPanels();
              this.save.emit();
            });
        },
        error: () => this.alertService.error('Error', 'Failed to add panelist(s)'),
      }),
    );
  }
}
