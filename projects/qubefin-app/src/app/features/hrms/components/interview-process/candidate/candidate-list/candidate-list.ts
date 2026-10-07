import { Component, input, output, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { CandidateInterviewStatus, ICandidateDownloadFile, ICandidateList } from '../../../../models/candidate';
import { MatMenuModule } from '@angular/material/menu';
import { Observable } from 'rxjs';
import { AlertService, DocumentModalService } from 'qubefin-core';
import { HrmsReportService } from '../../../../../Report/Service/hrms-report-service';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { toDisplayTime } from '../../interview-time';

interface CandidateReport {
  name: string;
  fileName: string;
  download: (candidateId: string) => Observable<Blob>;
}

/** How far along the workflow a status is, for the generated reports it unlocks. A stopped candidate
 * (Rejected / Not Selected) keeps the interview reports. */
const REPORT_STAGE: Record<CandidateInterviewStatus, number> = {
  'Schedule Pending': 0,
  'Interview Scheduled but Letter not sent': 1,
  'Interview Scheduled & Letter sent': 1,
  'Interview in Progress': 2,
  'HR Assessment Pending': 2,
  'Selection Pending': 2,
  'Not Selected': 2,
  Rejected: 2,
  'Candidate Verification in Progress': 3,
  'Joining in Progress': 4,
  Joined: 5,
};

@Component({
  selector: 'qfin-candidate-list',
  imports: [
    CommonModule,
    MatTableModule,
    MatTooltipModule,
    MatButtonModule,
    LucideDynamicIcon,
    MatPaginatorModule,
    MatSortModule,
    MatMenuModule,
  ],
  providers: [DatePipe],
  templateUrl: './candidate-list.html',
  styles: `
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
    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 9999px;
      background: currentColor;
      flex-shrink: 0;
    }
    .pill-slate { --pill-fg: #64748b; }
    .pill-orange { --pill-fg: #ea580c; }
    .pill-blue { --pill-fg: #2563eb; }
    .pill-indigo { --pill-fg: #4f46e5; }
    .pill-amber { --pill-fg: #d97706; }
    .pill-violet { --pill-fg: #7c3aed; }
    .pill-sky { --pill-fg: #0284c7; }
    .pill-teal { --pill-fg: #0d9488; }
    .pill-emerald { --pill-fg: #059669; }
    .pill-rose { --pill-fg: #e11d48; }
    .file-btn {
      width: 32px;
      height: 32px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      border: 1px solid color-mix(in srgb, currentColor 14%, transparent);
      background: color-mix(in srgb, #ffffff 6%, transparent);
      cursor: pointer;
      transition: background-color 0.15s, border-color 0.15s;
    }
    .file-btn:hover:not(:disabled) {
      border-color: color-mix(in srgb, #3b82f6 45%, transparent);
      background: color-mix(in srgb, #3b82f6 8%, transparent);
    }
    .file-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    .more-btn {
      height: 32px;
      min-width: 32px;
      padding: 0 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
      color: #64748b;
      cursor: pointer;
      transition: background-color 0.15s, color 0.15s;
    }
    .more-btn:hover {
      color: #4f46e5;
      background: color-mix(in srgb, #4f46e5 8%, transparent);
    }
    .menu-heading {
      padding: 8px 16px 4px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #94a3b8;
    }
    .menu-divider {
      height: 1px;
      margin: 6px 0;
      background: color-mix(in srgb, #94a3b8 25%, transparent);
    }
    .candidate-table th.mat-mdc-header-cell {
      white-space: nowrap;
    }
  `,
})
export class CandidateList {
  private readonly hrReportService = inject(HrmsReportService);
  private readonly alertService = inject(AlertService);
  private readonly documentModalService = inject(DocumentModalService);
  readonly downloadingReport = signal<string | null>(null);

  // Generated reports, each opening at a report stage (see REPORT_STAGE); a candidate gets every report up to
  // and including their stage. The blank job application form is downloaded from the page header instead.
  private readonly reports: { stage: number; report: CandidateReport }[] = [
    {
      stage: 1,
      report: {
        name: 'Interview Letter',
        fileName: 'interview_letter',
        download: (id) => this.hrReportService.getInterviewLetter(id) as Observable<Blob>,
      },
    },
    {
      stage: 2,
      report: {
        name: 'Interview Panel Acknowledgement',
        fileName: 'interview_panel_acknowledgement',
        download: (id) => this.hrReportService.getInterviewPanelAcknowledgement(id) as Observable<Blob>,
      },
    },
    {
      stage: 2,
      report: {
        name: 'Personality Form',
        fileName: 'personality_form',
        download: (id) => this.hrReportService.getPersonalityForm(id) as Observable<Blob>,
      },
    },
    {
      stage: 3,
      report: {
        name: 'Offer Letter',
        fileName: 'offer_letter',
        download: (id) => this.hrReportService.getOfferLetter(id) as Observable<Blob>,
      },
    },
    {
      stage: 4,
      report: {
        name: 'Appointment Letter',
        fileName: 'appointment_letter',
        download: (id) => this.hrReportService.getAppointmentLetter(id) as Observable<Blob>,
      },
    },
    {
      stage: 4,
      report: {
        name: 'Joining Letter',
        fileName: 'joining_letter',
        download: (id) => this.hrReportService.getJoiningLetter(id) as Observable<Blob>,
      },
    },
    {
      stage: 5,
      report: {
        name: 'Welcome Letter',
        fileName: 'welcome_letter',
        download: (id) => this.hrReportService.getWelcomeLetter(id) as Observable<Blob>,
      },
    },
  ];
  readonly data = input<ICandidateList[]>([]);
  readonly totalRecords = input(0);
  readonly pageIndex = input(0);
  readonly pageSize = input(10);
  readonly selectedId = input('');
  readonly isCollapsed = input(false);
  pageChanged = output<PageEvent>();
  onViewDetail = output<string>();
  onSchedule = output<ICandidateList>();
  sortChanged = output<Sort>();

  displayedColumns = [
    'sl',
    'name',
    'ref',
    'interviewPost',
    'companyName',
    'applicationDate',
    'interviewDate',
    'interviewTime',
    'recommendationStatus',
    'status',
    'reports',
    'action',
  ];
  get columns() {
    return this.isCollapsed() ? ['name', 'interviewPost', 'action'] : this.displayedColumns;
  }
  reportsFor(status: CandidateInterviewStatus): CandidateReport[] {
    const stage = REPORT_STAGE[status] ?? 0;
    return this.reports.filter((r) => r.stage <= stage).map((r) => r.report);
  }

  displayTime(value: string | null): string {
    return toDisplayTime(value);
  }

  /** An uploaded file the API offers for this candidate, by its name ("CV", "Job Application", ...). */
  findFile(item: ICandidateList, name: string): ICandidateDownloadFile | null {
    return item.downloads?.find((f) => f.name === name) ?? null;
  }

  /** Uploaded files other than the CV and job application, which have their own quick buttons. */
  otherUploads(item: ICandidateList): ICandidateDownloadFile[] {
    return (item.downloads ?? []).filter((f) => f.name !== 'CV' && f.name !== 'Job Application');
  }

  /** "PDF" / "Image" for uploaded files; "Link" for the credit bureau report, which is entered as a URL. */
  fileType(file: ICandidateDownloadFile): string {
    if (file.name === 'Credit Bureau Report') return 'Link';
    const extension = file.url.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
    if (extension === 'pdf') return 'PDF';
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(extension)) return 'Image';
    return extension.toUpperCase();
  }

  initials(name: string | null | undefined): string {
    if (!name) return '?';
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('');
  }

  /** Workflow status badge - grey before the interview, blue/indigo while interviewing, amber while HR acts,
   * sky/teal through joining, green when joined, rose when stopped. */
  statusClass(status: CandidateInterviewStatus): string {
    switch (status) {
      case 'Schedule Pending':
        return 'pill-slate';
      case 'Interview Scheduled but Letter not sent':
        return 'pill-orange';
      case 'Interview Scheduled & Letter sent':
        return 'pill-blue';
      case 'Interview in Progress':
        return 'pill-indigo';
      case 'HR Assessment Pending':
      case 'Selection Pending':
        return 'pill-amber';
      case 'Candidate Verification in Progress':
        return 'pill-violet';
      case 'Joining in Progress':
        return 'pill-sky';
      case 'Joined':
        return 'pill-emerald';
      case 'Rejected':
      case 'Not Selected':
        return 'pill-rose';
      default:
        return 'pill-slate';
    }
  }

  /** HR Assessment outcome badge. */
  recommendationClass(status: string | null | undefined): string {
    if (status?.endsWith('but not selected')) {
      return 'pill-rose';
    }
    switch (status) {
      case 'Strongly Recommended':
        return 'pill-emerald';
      case 'Recommended':
        return 'pill-teal';
      case 'Recommended with Training':
        return 'pill-sky';
      case 'Hold for Future Opportunity':
        return 'pill-amber';
      case 'Not Recommended':
      case 'Rejected':
        return 'pill-rose';
      default:
        return 'pill-slate';
    }
  }

  /** Generates the report and shows it in the shared document viewer, which offers the download. */
  onOpenReport(item: ICandidateList, report: CandidateReport) {
    this.downloadingReport.set(item.id);
    report.download(item.id).subscribe({
      next: (blob) => {
        this.documentModalService.open({
          url: URL.createObjectURL(blob),
          documentName: `${report.fileName}_${item.referenceNo}`,
          extension: 'pdf',
          downloadAccess: true,
        });
        this.downloadingReport.set(null);
      },
      error: () => {
        this.downloadingReport.set(null);
        this.alertService.error('Failed', `Unable to open ${report.name}.`);
      },
    });
  }

  /** Opens an uploaded candidate file (already a URL from the API) in the shared document viewer. */
  onOpenFile(item: ICandidateList, file: ICandidateDownloadFile) {
    const path = file.url.split('?')[0];
    const extension = path.includes('.') ? path.split('.').pop()!.toLowerCase() : '';
    this.documentModalService.open({
      url: file.url,
      documentName: `${file.name.toLowerCase().replace(/\s+/g, '_')}_${item.referenceNo}`,
      extension,
      downloadAccess: true,
    });
  }

  onDetailView(id: string) {
    this.onViewDetail.emit(id);
  }

  onScheduleClick(item: ICandidateList) {
    if (item.canSchedule) {
      this.onSchedule.emit(item);
    }
  }

  onPage(event: PageEvent) {
    this.pageChanged.emit(event);
  }

  onSortChange(sort: Sort) {
    this.sortChanged.emit(sort);
  }
}
