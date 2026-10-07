import { Component, computed, inject, signal } from '@angular/core';
import { AlertService, DocumentModalService, EMPTY_UUID } from 'qubefin-core';
import { MatMenuModule } from '@angular/material/menu';
import { HrmsReportService } from '../../../Report/Service/hrms-report-service';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { CommonModule, DatePipe } from '@angular/common';
import { CandidateList } from '../../components/interview-process/candidate/candidate-list/candidate-list';
import { CandidateView } from '../../components/interview-process/candidate/candidate-view/candidate-view';
import { CandidateDetail } from '../../components/interview-process/candidate/candidate-detail/candidate-detail';
import { CandidateStore } from '../../stores/candidate-store';
import { form, FormField } from '@angular/forms/signals';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  CANDIDATE_STATUSES,
  ICandidate,
  ICandidateList,
  ICandidateSearchModel,
  RECOMMENDATION_STATUSES,
} from '../../models/candidate';
import { Sort } from '@angular/material/sort';
import { PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { CompanyStore } from '../../../global/stores/company-store';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { CandidateJoiningInfo } from '../../components/interview-process/candidate/candidate-joining-info/candidate-joining-info';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import {
  IScheduleInterviewDialogData,
  ScheduleInterviewDialog,
} from '../../components/interview-process/candidate/schedule-interview-dialog/schedule-interview-dialog';
import { toApiDate } from '../../components/interview-process/interview-time';
@Component({
  selector: 'qfin-candidate-component',
  imports: [
    FormField,
    MatSelectModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatIconModule,
    MatTooltipModule,
    MatMenuModule,
    LucideDynamicIcon,
    CommonModule,
    CandidateList,
    CandidateView,
    CandidateDetail,
    CandidateJoiningInfo,
  ],
  providers: [provideNativeDateAdapter(), DatePipe],
  templateUrl: './candidate-component.html',
  styles: ``,
})
export class CandidateComponent {
  readonly dateAdapter = inject(DateAdapter<Date>);
  public readonly EMPTY_UUID = EMPTY_UUID;
  readonly candidateStore = inject(CandidateStore);
  readonly companyStore = inject(CompanyStore);
  private readonly dialog = inject(MatDialog);
  private readonly hrReportService = inject(HrmsReportService);
  private readonly documentModalService = inject(DocumentModalService);
  private readonly alertService = inject(AlertService);
  protected readonly downloadingJobApplication = signal(false);
  protected readonly candidateStatuses = CANDIDATE_STATUSES;
  protected readonly recommendationStatuses = RECOMMENDATION_STATUSES;
  readonly isUpdateMode = signal<boolean>(false);
  readonly isViewMode = signal<boolean>(true);
  /** Candidate form is open on an existing candidate (basic details edit). */
  readonly isEditDetailsMode = signal<boolean>(false);
  readonly showFilterArea = signal<boolean>(false);
  readonly selectedCandidateId = signal<string>(EMPTY_UUID);
  readonly candidates = this.candidateStore.candidates;
  readonly hasSelectedCandidate = computed(
    () => this.selectedCandidateId() !== EMPTY_UUID || !this.isViewMode(),
  );

  readonly searchModel = signal<ICandidateSearchModel>(this.emptySearchModel());
  readonly companies = this.companyStore.companies;
  readonly searchForm = form(this.searchModel);
  protected onView(id: string) {
    this.selectedCandidateId.set(id);
    this.isViewMode.set(true);
    this.isUpdateMode.set(false);
    this.isEditDetailsMode.set(false);
  }
  /** The candidate form opens on its Joining Details step (offer letter's "Update Joining Details"). */
  readonly openJoiningStep = signal<boolean>(false);
  // Opens the candidate form on the selected candidate to edit its basic details.
  protected onEditDetails(id: string, openJoiningStep = false) {
    this.selectedCandidateId.set(id);
    this.openJoiningStep.set(openJoiningStep);
    this.isViewMode.set(false);
    this.isUpdateMode.set(false);
    this.isEditDetailsMode.set(true);
  }
  // Leaving the edit form goes back to that candidate's view, not the list.
  protected onEditDetailsDone() {
    const id = this.selectedCandidateId();
    this.candidateStore.refreshDetail();
    this.onView(id);
  }
  // Opens the joining information form for the candidate (Add Additional Info).
  protected onEdit(candidate: ICandidate) {
    this.selectedCandidateId.set(candidate.id);

    this.isViewMode.set(false);
    this.isUpdateMode.set(true);
  }
  protected onAdd() {
    this.isViewMode.set(false);
    this.isEditDetailsMode.set(false);
    this.selectedCandidateId.set(EMPTY_UUID);
    this.isUpdateMode.set(false);
  }
  protected closePanel() {
    this.isEditDetailsMode.set(false);
    this.selectedCandidateId.set(EMPTY_UUID);
    this.isViewMode.set(true);
    this.isUpdateMode.set(false);
  }
  protected toggleFilterArea() {
    this.showFilterArea.update((v) => !v);
  }
  protected applyFilters() {
    const model = this.searchModel();
    this.candidateStore.setFilters({
      searchText: model.tempSearch.trim(),
      companyId: model.companyId || null,
      applicationDateFrom: toApiDate(model.applicationDateFrom || null),
      applicationDateTo: toApiDate(model.applicationDateTo || null),
      interviewDate: toApiDate(model.interviewDate || null),
      recommendationStatus: model.recommendationStatus || null,
      status: model.status || null,
    });
  }
  protected resetFilters() {
    this.searchModel.set(this.emptySearchModel());
    this.applyFilters();
  }
  /** Schedule action: add or update the interview date/time only - no panel, interviewer or letter. */
  protected onSchedule(candidate: ICandidateList) {
    const dialogRef = this.dialog.open(ScheduleInterviewDialog, {
      width: '560px',
      maxWidth: '95vw',
      panelClass: ['glass-modal', 'slide-in-up'],
      data: {
        candidateId: candidate.id,
        candidateName: candidate.fullName,
        interviewDate: candidate.interviewDate,
        interviewTime: candidate.interviewTime,
      } satisfies IScheduleInterviewDialogData,
    });
    dialogRef.afterClosed().subscribe((saved) => {
      if (!saved) return;
      this.candidateStore.refreshList();
      if (this.selectedCandidateId() === candidate.id) {
        this.candidateStore.refreshDetail();
      }
    });
  }
  constructor() {
    this.dateAdapter.setLocale('en-GB');
  }
  /** Blank job application form of the chosen company, opened in the document viewer (which offers download). */
  protected onDownloadJobApplication(company: { id: string; name: string }) {
    if (this.downloadingJobApplication()) return;

    this.downloadingJobApplication.set(true);
    this.hrReportService.getBlankJobApplication(company.id).subscribe({
      next: (blob) => {
        this.downloadingJobApplication.set(false);
        this.documentModalService.open({
          url: URL.createObjectURL(blob),
          documentName: `job_application_${company.name.toLowerCase().replace(/\s+/g, '_')}`,
          extension: 'pdf',
          downloadAccess: true,
        });
      },
      error: () => {
        this.downloadingJobApplication.set(false);
        this.alertService.error(
          'Failed',
          `Unable to download the job application for ${company.name}.`,
        );
      },
    });
  }
  private emptySearchModel(): ICandidateSearchModel {
    return {
      tempSearch: '',
      companyId: '',
      applicationDateFrom: '',
      applicationDateTo: '',
      interviewDate: '',
      recommendationStatus: '',
      status: '',
    };
  }
  protected changePage(delta: number) {
    const current = this.candidateStore.pageIndex();
    const next = current + delta;
    if (next >= 0) {
      this.candidateStore.setPage(next);
    }
  }
  pageChanged(event: PageEvent) {
    this.candidateStore.setPage(event.pageIndex);
    this.candidateStore.setPageSize(event.pageSize);
  }
  onSortChanged(sort: Sort) {
    if (!sort.direction) {
      return;
    }
    this.candidateStore.setSort(sort.active, sort.direction as 'asc' | 'desc');
  }
}
