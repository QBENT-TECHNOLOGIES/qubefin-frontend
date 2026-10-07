import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService, DocumentModalService } from 'qubefin-core';
import { InterviewStore } from '../../stores/interview-store';
import { InterviewPanelService } from '../../services/interview-panel-service';
import { IInterviewerCandidate, InterviewStatus, InterviewTab } from '../../models/interview-panel';
import {
  CandidateAttendanceDialog,
  ICandidateAttendanceDialogData,
} from '../../components/interview-process/interview/candidate-attendance-dialog/candidate-attendance-dialog';
import {
  IInterviewAssessmentDialogData,
  InterviewAssessmentDialog,
} from '../../components/interview-process/interview/interview-assessment-dialog/interview-assessment-dialog';
import { toApiDate, toDisplayTime, toLocalDate } from '../../components/interview-process/interview-time';

/** Short label and colour of each row status. */
const STATUS_BADGE: Record<InterviewStatus, { label: string; pill: string }> = {
  'Acknowledgement Pending': { label: 'Ack. pending', pill: 'pill-amber' },
  Acknowledged: { label: 'Acknowledged', pill: 'pill-blue' },
  'Started Assessment': { label: 'In assessment', pill: 'pill-violet' },
  'Assessment Completed': { label: 'Completed', pill: 'pill-emerald' },
  'Interview Closed': { label: 'Closed', pill: 'pill-slate' },
};

/** Interview page - for interviewers only. Lists the signed-in interviewer's own interviews: acknowledge (one or
 * many at once), Start Assessment (record the candidate's attendance, then assess), View Assessment, View CV. */
@Component({
  selector: 'qfin-interview-component',
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    LucideDynamicIcon,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './interview-component.html',
  styles: `
    .tab {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 34px;
      padding: 0 14px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
      cursor: pointer;
      color: #64748b;
      border: 1px solid color-mix(in srgb, #94a3b8 35%, transparent);
      background: color-mix(in srgb, #ffffff 55%, transparent);
      transition: all 0.15s;
    }
    .tab:hover { color: #4f46e5; border-color: color-mix(in srgb, #4f46e5 40%, transparent); }
    .tab.active {
      color: #4338ca;
      border-color: color-mix(in srgb, #4f46e5 55%, transparent);
      background: color-mix(in srgb, #4f46e5 10%, transparent);
    }
    .tab-count {
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, currentColor 12%, transparent);
    }
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px;
      border-radius: 9999px;
      font-size: 11.5px;
      font-weight: 600;
      line-height: 1.4;
      white-space: nowrap;
      color: var(--pill-fg);
      background: color-mix(in srgb, var(--pill-fg) 10%, transparent);
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pill-fg) 22%, transparent);
    }
    .status-dot { width: 6px; height: 6px; border-radius: 9999px; background: currentColor; flex-shrink: 0; }
    .pill-slate { --pill-fg: #64748b; }
    .pill-blue { --pill-fg: #2563eb; }
    .pill-amber { --pill-fg: #d97706; }
    .pill-violet { --pill-fg: #7c3aed; }
    .pill-emerald { --pill-fg: #059669; }
    .icon-btn {
      width: 32px;
      height: 32px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      border: 1px solid color-mix(in srgb, #94a3b8 35%, transparent);
      cursor: pointer;
      transition: background-color 0.15s, border-color 0.15s;
    }
    .icon-btn:hover:not(:disabled) {
      border-color: color-mix(in srgb, #3b82f6 45%, transparent);
      background: color-mix(in srgb, #3b82f6 8%, transparent);
    }
    .icon-btn:disabled { opacity: 0.3; cursor: not-allowed; }
    .act-btn {
      height: 32px;
      padding: 0 12px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border-radius: 8px;
      font-size: 12.5px;
      font-weight: 600;
      white-space: nowrap;
      cursor: pointer;
      transition: all 0.15s;
    }
    .act-primary { color: #ffffff; background: #4f46e5; }
    .act-primary:hover { background: #4338ca; }
    .act-ghost { color: #475569; border: 1px solid color-mix(in srgb, #94a3b8 40%, transparent); }
    .act-ghost:hover { color: #4f46e5; border-color: color-mix(in srgb, #4f46e5 40%, transparent); }
    .interview-table th.mat-mdc-header-cell { white-space: nowrap; }
  `,
})
export class InterviewComponent {
  readonly store = inject(InterviewStore);
  private readonly panelService = inject(InterviewPanelService);
  private readonly alertService = inject(AlertService);
  private readonly documentModalService = inject(DocumentModalService);
  private readonly dialog = inject(MatDialog);

  protected readonly columns = [
    'select',
    'sl',
    'candidate',
    'interviewPost',
    'companyName',
    'applicationDate',
    'interview',
    'status',
    'cv',
    'action',
  ];

  // Quick tabs + filters
  protected readonly activeTab = signal<InterviewTab>('');
  protected readonly searchText = signal('');
  protected readonly interviewDateFilter = signal<Date | null>(null);
  protected readonly tabs = computed(() => {
    const counts = this.store.counts();
    return [
      { value: '' as InterviewTab, label: 'All open', count: counts.allOpen },
      { value: 'Today' as InterviewTab, label: 'Today', count: counts.today },
      { value: 'Acknowledgement Pending' as InterviewTab, label: 'Acknowledgement pending', count: counts.acknowledgementPending },
      { value: 'Assessment Completed' as InterviewTab, label: 'Completed', count: counts.completed },
    ];
  });

  /** Interviews ticked for bulk acknowledgement - only "Acknowledgement Pending" ones can be ticked. */
  protected readonly selectedIds = signal<Set<string>>(new Set());
  protected readonly acknowledging = signal(false);

  protected readonly acknowledgeable = computed(() => this.store.interviews().filter((i) => i.canAcknowledge));
  protected readonly selectedCount = computed(() => this.selectedIds().size);
  protected readonly allSelected = computed(() => {
    const rows = this.acknowledgeable();
    return rows.length > 0 && rows.every((r) => this.selectedIds().has(r.candidateId));
  });

  private readonly todayKey = toApiDate(new Date());

  constructor() {
    inject(DateAdapter<Date>).setLocale('en-GB');
  }

  // ============================================================
  // FILTERS
  // ============================================================

  protected setTab(tab: InterviewTab) {
    this.activeTab.set(tab);
    this.applyFilters();
  }

  protected applyFilters() {
    this.selectedIds.set(new Set());
    this.store.setFilters({
      searchText: this.searchText(),
      status: this.activeTab() || null,
      interviewDate: toApiDate(this.interviewDateFilter()),
    });
  }

  protected onDateChange(date: Date | null) {
    this.interviewDateFilter.set(date);
    this.applyFilters();
  }

  protected clearSearch() {
    this.searchText.set('');
    this.interviewDateFilter.set(null);
    this.applyFilters();
  }

  protected onPage(event: PageEvent) {
    this.selectedIds.set(new Set());
    this.store.setPage(event.pageIndex, event.pageSize);
  }

  // ============================================================
  // DISPLAY
  // ============================================================

  protected badge(status: InterviewStatus) {
    return STATUS_BADGE[status] ?? { label: status, pill: 'pill-slate' };
  }

  protected isToday(date: string | null): boolean {
    return !!date && date.split('T')[0] === this.todayKey;
  }

  protected asDate(date: string | null): Date | '' {
    return toLocalDate(date);
  }

  protected displayTime(value: string | null): string {
    return toDisplayTime(value);
  }

  protected initials(name: string | null | undefined): string {
    if (!name) return '?';
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('');
  }

  // ============================================================
  // BULK ACKNOWLEDGEMENT
  // ============================================================

  protected isSelected(row: IInterviewerCandidate) {
    return this.selectedIds().has(row.candidateId);
  }

  protected toggleRow(row: IInterviewerCandidate, checked: boolean) {
    if (!row.canAcknowledge) return;
    this.selectedIds.update((ids) => {
      const next = new Set(ids);
      if (checked) next.add(row.candidateId);
      else next.delete(row.candidateId);
      return next;
    });
  }

  protected toggleAll(checked: boolean) {
    this.selectedIds.set(checked ? new Set(this.acknowledgeable().map((r) => r.candidateId)) : new Set());
  }

  protected clearSelection() {
    this.selectedIds.set(new Set());
  }

  protected onAcknowledgeSelected() {
    const ids = [...this.selectedIds()];
    if (ids.length === 0 || this.acknowledging()) return;

    this.acknowledging.set(true);
    this.panelService.acknowledgeInterviews(ids).subscribe({
      next: (message: any) => {
        this.acknowledging.set(false);
        this.selectedIds.set(new Set());
        this.alertService.success('Acknowledged', typeof message === 'string' ? message : 'Interviews acknowledged.');
        this.store.refresh();
      },
      error: (error: any) => {
        this.acknowledging.set(false);
        this.alertService.error('Failed', error?.error?.message ?? 'Unable to acknowledge the selected interviews.');
        this.store.refresh();
      },
    });
  }

  // ============================================================
  // ASSESSMENT
  // ============================================================

  /** Start Assessment: record the candidate's attendance first. Present opens the assessment; Absent finishes. */
  protected onStartAssessment(row: IInterviewerCandidate) {
    const dialogRef = this.dialog.open(CandidateAttendanceDialog, {
      width: '520px',
      maxWidth: '95vw',
      disableClose: true,
      panelClass: ['glass-modal', 'slide-in-up'],
      data: { candidateId: row.candidateId, candidateName: row.fullName } satisfies ICandidateAttendanceDialogData,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;
      this.store.refresh();
      if (result === 'present') {
        this.openAssessment(row, false);
      }
    });
  }

  protected openAssessment(row: IInterviewerCandidate, readOnly: boolean) {
    const dialogRef = this.dialog.open(InterviewAssessmentDialog, {
      width: '1200px',
      maxWidth: '95vw',
      disableClose: !readOnly,
      panelClass: 'glass-modal',
      data: {
        candidateId: row.candidateId,
        candidateName: row.fullName,
        referenceNo: row.referenceNo,
        readOnly,
      } satisfies IInterviewAssessmentDialogData,
    });

    dialogRef.afterClosed().subscribe(() => {
      if (!readOnly) this.store.refresh();
    });
  }

  protected onViewCv(row: IInterviewerCandidate) {
    if (!row.cvFileUrl) return;
    const path = row.cvFileUrl.split('?')[0];
    const extension = path.includes('.') ? path.split('.').pop()!.toLowerCase() : '';
    this.documentModalService.open({
      url: row.cvFileUrl,
      documentName: `cv_${row.referenceNo ?? row.fullName}`,
      extension,
      downloadAccess: true,
    });
  }
}
