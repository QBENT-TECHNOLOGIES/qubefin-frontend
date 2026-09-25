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
import { MatDialog } from '@angular/material/dialog';
import { InterviewPanelDetail } from '../interview-panel-detail/interview-panel-detail';

interface CandidateReport {
  name: string;
  fileName: string;
  download: (candidateId: string) => Observable<Blob>;
}

const STAGE_ORDER: Exclude<CandidateInterviewStatus, 'Rejected'>[] = [
  'Interview in Progress',
  'Candidate Verification in Progress',
  'Joining in Progress',
  'Joined',
];

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
  styles: ``,
})
export class CandidateList {
  private readonly dialog = inject(MatDialog);
  private readonly hrReportService = inject(HrmsReportService);
  private readonly alertService = inject(AlertService);
  private readonly documentModalService = inject(DocumentModalService);
  readonly downloadingReport = signal<string | null>(null);

  // Reports each stage makes available; a candidate gets every report up to and including their stage.
  private readonly reportsByStage: Record<Exclude<CandidateInterviewStatus, 'Rejected'>, CandidateReport[]> = {
    'Interview in Progress': [
      {
        name: 'Job Application',
        fileName: 'job_application',
        download: (id) => this.hrReportService.getJobApplication(id) as Observable<Blob>,
      },
      {
        name: 'Interview Letter',
        fileName: 'interview_letter',
        download: (id) => this.hrReportService.getInterviewLetter(id) as Observable<Blob>,
      },
      {
        name: 'Interview Panel Acknowledgement',
        fileName: 'interview_panel_acknowledgement',
        download: (id) => this.hrReportService.getInterviewPanelAcknowledgement(id) as Observable<Blob>,
      },
      {
        name: 'Personality Form',
        fileName: 'personality_form',
        download: (id) => this.hrReportService.getPersonalityForm(id) as Observable<Blob>,
      },
    ],
    'Candidate Verification in Progress': [
      {
        name: 'Offer Letter',
        fileName: 'offer_letter',
        download: (id) => this.hrReportService.getOfferLetter(id) as Observable<Blob>,
      },
    ],
    'Joining in Progress': [
      {
        name: 'Appointment Letter',
        fileName: 'appointment_letter',
        download: (id) => this.hrReportService.getAppointmentLetter(id) as Observable<Blob>,
      },
      {
        name: 'Joining Letter',
        fileName: 'joining_letter',
        download: (id) => this.hrReportService.getJoiningLetter(id) as Observable<Blob>,
      },
    ],
    Joined: [
      {
        name: 'Welcome Letter',
        fileName: 'welcome_letter',
        download: (id) => this.hrReportService.getWelcomeLetter(id) as Observable<Blob>,
      },
    ],
  };
  readonly data = input<ICandidateList[]>([]);
  readonly totalRecords = input(0);
  readonly pageIndex = input(0);
  readonly pageSize = input(10);
  readonly selectedId = input('');
  readonly isCollapsed = input(false);
  pageChanged = output<PageEvent>();
  onViewDetail = output<string>();
  sortChanged = output<Sort>();

  displayedColumns = [
    'sl',
    'name',
    'ref',
    'interviewPost',
    'interviewDate',
    'interviewTime',
    'recommendationStatus',
    'interviewStatus',
    'reports',
    'action',
  ];
  get columns() {
    return this.isCollapsed() ? ['name', 'interviewPost', 'action'] : this.displayedColumns;
  }
  reportsFor(status: CandidateInterviewStatus): CandidateReport[] {
    // Rejected (HR did not recommend) - the flow ended after the interview, so only the interview reports apply.
    if (status === 'Rejected') {
      return this.reportsByStage['Interview in Progress'];
    }
    const stage = Math.max(STAGE_ORDER.indexOf(status), 0);
    return STAGE_ORDER.slice(0, stage + 1).flatMap((s) => this.reportsByStage[s]);
  }

  statusClass(status: CandidateInterviewStatus): string {
    switch (status) {
      case 'Rejected':
        return 'bg-rose-500/10 text-rose-600';
      case 'Candidate Verification in Progress':
        return 'bg-amber-500/10 text-amber-600';
      case 'Joining in Progress':
        return 'bg-sky-500/10 text-sky-600';
      case 'Joined':
        return 'bg-green-100 text-emerald-600';
      default:
        return 'bg-indigo-500/10 text-indigo-600';
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

  onPage(event: PageEvent) {
    this.pageChanged.emit(event);
  }

  onSortChange(sort: Sort) {
    this.sortChanged.emit(sort);
  }
}
