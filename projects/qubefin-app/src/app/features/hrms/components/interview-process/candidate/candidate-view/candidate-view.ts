import { Component, computed, effect, inject, model, output, signal } from '@angular/core';

import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';

import { AlertService, DocumentModalService, EMPTY_UUID } from 'qubefin-core';

import { CandidateStore } from '../../../../stores/candidate-store';
import { InterviewPanelDetail } from '../interview-panel-detail/interview-panel-detail';
import { HrAssessmentForm } from '../hr-assessment-form/hr-assessment-form';
import { CandidateVerificationDetail } from '../candidate-verification/candidate-verification-detail';
import { LetterActions } from '../letter-actions/letter-actions';
import { FileActions } from '../file-actions/file-actions';
import { HrmsReportService } from '../../../../../Report/Service/hrms-report-service';
import { CandidateService } from '../../../../services/candidate-service';
import { Observable, firstValueFrom } from 'rxjs';
import { ICandidate } from '../../../../models/candidate';
import { toDisplayTime } from '../../interview-time';

interface WorkflowStage {
  label: string;
  icon: string;
  done: boolean;
  current: boolean;
}

@Component({
  selector: 'qfin-candidate-view',
  imports: [
    DatePipe,
    LucideDynamicIcon,
    MatButtonModule,
    MatCheckboxModule,
    MatTooltipModule,
    LetterActions,
    FileActions,
  ],
  templateUrl: './candidate-view.html',
  styles: ``,
})
export class CandidateView {
  readonly datePipe = inject(DatePipe);
  readonly candidateStore = inject(CandidateStore);
  private readonly documentModalService = inject(DocumentModalService);
  private readonly hrReportService = inject(HrmsReportService);
  private readonly candidateService = inject(CandidateService);
  private readonly alertService = inject(AlertService);
  readonly dialog = inject(MatDialog);
  onUpdateAction = output<ICandidate>();
  /** Opens the candidate form to edit the basic details - offered until the offer letter is received. */
  onEditDetails = output<string>();
  readonly candidateId = model<string>(EMPTY_UUID);

  readonly candidate = this.candidateStore.candidate;
  readonly loading = this.candidateStore.candidateLoading;
  readonly error = this.candidateStore.candidateError;

  readonly sendingMail = signal(false);
  readonly recievingMail = signal(false);
  readonly uploadingInterviewFormat = signal(false);
  readonly uploadingJoiningLetter = signal(false);
  readonly rejecting = signal(false);
  readonly selecting = signal(false);

  constructor() {
    effect(() => {
      this.candidateStore.setCandidateId(this.candidateId());
    });
  }

  // ============================================================
  // ACTION VISIBILITY
  //
  // Every action is gated by a flag from USP_GetInterviewCandidateById (HR acts until the workflow stops,
  // Admin - the candidate's creator - only until HR saves the HR Assessment draft). Interviewer actions are
  // on the Interview page, not here.
  // ============================================================

  /** HR rejected the candidate, or submitted the HR Assessment with an outcome that does not qualify. Nothing
   * further can be done - every action is hidden (the API refuses them too) and the Workflow Path stops. */
  readonly isWorkflowStopped = computed(() => {
    const data = this.candidate();
    return !!data?.isRejected || !!data?.isNotSelected;
  });

  readonly stoppedStatusLabel = computed(() =>
    this.candidate()?.isRejected ? 'Rejected' : 'Not Selected',
  );

  /** A saved-but-unsubmitted HR Assessment reopens the same form, so say so on the button. */
  readonly hrAssessmentButtonLabel = computed(() =>
    this.candidate()?.isHrAssessmentDraftSaved ? 'Continue HR Assessment' : 'HR Assessment',
  );

  /** Uploaded documents on record - each row appears only once its file exists. */
  readonly documents = computed(() => {
    const data = this.candidate();
    if (!data) return [];
    return [
      { label: 'CV', url: data.cvFileUrl },
      { label: 'Job Application', url: data.jobApplicationFileUrl },
      { label: 'Written Interview File', url: data.writtenInterviewFIleUrl },
      { label: 'Signed Joining Letter', url: data.signedJoiningLetterFileUrl },
    ].filter((doc): doc is { label: string; url: string } => !!doc.url);
  });

  /** Is there anything at all for this user to do on this candidate? The Actions card carries no status
   * badges - completed steps are reported by the Workflow Path panel - so when every gate is closed the
   * card would otherwise render empty. */
  readonly hasAnyAction = computed(() => {
    const data = this.candidate();
    if (!data || this.isWorkflowStopped()) {
      return false;
    }

    return (
      !!data.showRejectButton ||
      !!data.showInterviewFormatActions ||
      !!data.showInterviewLetterActions ||
      !!data.showCreatePanelButton ||
      !!data.showViewPanelButton ||
      !!data.isShowHrAssessmentButton ||
      !!data.showSelectForOfferButton ||
      (!!data.isShowCandidateVerificationButton && !data.isCandidateVerificationCompleted) ||
      !!data.showOfferLetterActions ||
      (!!data.isJoiningLetterUploaded && !!data.isHR && !data.isEmployeeCreated) ||
      !!data.showAppointmentLetterActions ||
      (!!data.showJoiningLetterActions && !data.isJoiningLetterUploaded) ||
      (!!data.isJoiningLetterUploaded && !!data.isEmployeeCreated)
    );
  });

  // ============================================================
  // WORKFLOW PATH
  // ============================================================

  readonly workflowStages = computed<WorkflowStage[]>(() => {
    const data = this.candidate();

    if (!data) {
      return [];
    }

    const stages: Omit<WorkflowStage, 'current'>[] = [
      {
        label: 'Interview Schedule',
        icon: 'calendar-clock',
        done: !!data.interviewDate,
      },
      {
        label: 'Interview Letter',
        icon: 'file-check-2',
        done: !!data.isInterviewLetterReceived,
      },
      {
        label: 'Panel Creation',
        icon: 'users-round',
        done: !!data.isPanelCreated,
      },
      {
        label: 'Panel Acknowledge',
        icon: 'badge-check',
        done: !!data.isAllPanelAcknowledged,
      },
      {
        label: 'Panel Assessment',
        icon: 'clipboard-check',
        done: !!data.isAllPanelAssessmentSubmitted,
      },
      {
        label: 'HR Assessment',
        icon: 'user-check',
        done: !!data.isHrAssessmentCompleted,
      },
      {
        label: 'Candidate Selection',
        icon: 'thumbs-up',
        done: !!data.isSelectedForOffer,
      },
      {
        label: 'Candidate Verification',
        icon: 'shield-check',
        done: !!data.isCandidateVerificationCompleted,
      },
      {
        label: 'Offer Letter',
        icon: 'file-check',
        done: !!data.isOfferLetterReceived,
      },
      {
        label: 'Appointment Letter',
        icon: 'file-check',
        done: !!data.isAppointmentLetterReceived,
      },
      {
        label: 'Joining Letter',
        icon: 'file-check',
        done: !!data.isJoiningLetterUploaded,
      },
      {
        label: 'Welcome Letter',
        icon: 'file-check',
        done: !!data.isWelcomeLetterRecieved,
      },
    ];

    const currentIndex = stages.findIndex((s) => !s.done);

    return stages.map((s, i) => ({
      ...s,
      current: i === currentIndex,
    }));
  });

  readonly currentStageLabel = computed(() => {
    const stages = this.workflowStages();

    return stages.find((s) => s.current)?.label ?? stages.at(-1)?.label ?? '-';
  });

  readonly isWorkflowComplete = computed(() => {
    const stages = this.workflowStages();
    return stages.length > 0 && stages.every((s) => s.done);
  });

  displayTime(value: string | null | undefined): string {
    return toDisplayTime(value);
  }

  getInitials(name: string | undefined | null): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('');
  }

  // ============================================================
  // DOCUMENTS
  // ============================================================

  /** The file's own name, taken off the stored URL - the API hands back a path, not a display name. */
  getFileName(url: string | null | undefined): string {
    if (!url) {
      return '-';
    }

    const name = url.split(/[?#]/)[0].split(/[\\/]/).pop();

    return name ? decodeURIComponent(name) : '-';
  }

  /** Opens a stored document in the shared viewer. */
  openDocument(url: string | null | undefined, name: string) {
    if (!url) {
      return;
    }

    this.documentModalService.open({
      url,
      documentName: name,
      extension: name.split('.').pop()?.toLowerCase() || '',
      downloadAccess: true,
    });
  }

  // ============================================================
  // HELPER
  // ============================================================

  private getCandidate() {
    const candidate = this.candidate();

    if (!candidate) {
      return null;
    }

    return candidate;
  }

  // ============================================================
  // INTERVIEW LETTER
  // ============================================================

  async onViewInterviewLetterMail() {
    const candidate = this.getCandidate();

    if (!candidate) return;

    try {
      const file = await firstValueFrom(this.hrReportService.getInterviewLetter(candidate.id));
      const fileUrl = URL.createObjectURL(file);

      this.documentModalService.open({
        url: fileUrl,
        documentName: `interview_letter_${candidate.referenceNo}`,
        extension: 'pdf',
        downloadAccess: true,
      });
    } catch (error: any) {
      this.alertService.error('Failed', error?.error?.message ?? 'Unable to load payslip.');
    } finally {
    }
  }

  /** The rendered letter for a given step - the same report View & Print opens. */
  private getLetterReport(letter: string, candidateId: string): Observable<Blob> | null {
    switch (letter) {
      case 'interview':
        return this.hrReportService.getInterviewLetter(candidateId) as Observable<Blob>;

      case 'offer':
        return this.hrReportService.getOfferLetter(candidateId) as Observable<Blob>;

      case 'appointment':
        return this.hrReportService.getAppointmentLetter(candidateId) as Observable<Blob>;

      case 'welcome':
        return this.hrReportService.getWelcomeLetter(candidateId) as Observable<Blob>;

      default:
        return null;
    }
  }

  /** The send endpoint mails the PDF it is given rather than rendering one itself, so the report is
   * fetched here first and posted with the flag as the `File` part. */
  async onSendLetterMail(letter: string) {
    if (!letter) return;

    const candidate = this.getCandidate();
    if (!candidate) return;

    const payload: any = {};

    switch (letter) {
      case 'interview':
        payload.isInterviewLetterReceived = true;
        break;

      case 'offer':
        payload.isOfferLetterReceived = true;
        break;

      case 'appointment':
        payload.isAppointmentLetterReceived = true;
        break;

      case 'welcome':
        payload.isWelcomeLetterReceived = true;
        break;

      default:
        return;
    }

    const report = this.getLetterReport(letter, candidate.id);
    if (!report) return;

    this.sendingMail.set(true);

    let file: File;

    try {
      const blob = await firstValueFrom(report);
      const name = `${letter}_letter_${candidate.referenceNo ?? candidate.id}.pdf`;
      file = new File([blob], name, { type: blob.type || 'application/pdf' });
    } catch (error: any) {
      this.sendingMail.set(false);
      this.alertService.error(
        'Failed',
        error?.error?.message ?? `Unable to generate the ${this.getLetterName(letter)} letter.`,
      );
      return;
    }

    this.candidateService.sendLetterToCandidate(candidate.id, payload, file).subscribe({
      next: () => {
        this.alertService.success('Success', `${this.getLetterName(letter)} letter mail sent`);

        this.candidateStore.refreshDetail();
      },
      error: (error: any) => {
        this.sendingMail.set(false);
      },
      complete: () => this.sendingMail.set(false),
    });
  }
  onRecieveLetter(letter: string) {
    if (!letter) return;

    const candidate = this.getCandidate();
    if (!candidate) return;

    const payload: any = {};

    switch (letter) {
      case 'interview':
        payload.isInterviewLetterReceived = true;
        break;

      case 'offer':
        payload.isOfferLetterReceived = true;
        break;

      case 'appointment':
        payload.isAppointmentLetterReceived = true;
        break;

      case 'welcome':
        payload.isWelcomeLetterReceived = true;
        break;

      default:
        return;
    }

    this.recievingMail.set(true);

    this.candidateService.updateLetterStatus(candidate.id, payload).subscribe({
      next: () => {
        this.alertService.success('Success', `${this.getLetterName(letter)} letter mail sent`);

        this.candidateStore.refreshDetail();
      },
      error: (error: any) =>
        this.alertService.error(
          'Failed',
          error?.error?.message ?? `Unable to send ${letter} letter mail.`,
        ),
      complete: () => this.recievingMail.set(false),
    });
  }

  private getLetterName(letter: string): string {
    switch (letter) {
      case 'interview':
        return 'Interview';
      case 'offer':
        return 'Offer';
      case 'appointment':
        return 'Appointment';
      case 'welcome':
        return 'Welcome';
      default:
        return '';
    }
  }

  // ============================================================
  // OFFER LETTER
  // ============================================================

  async onViewOfferLetterMail() {
    const candidate = this.getCandidate();

    if (!candidate) return;

    try {
      const file = await firstValueFrom(this.hrReportService.getOfferLetter(candidate.id));
      const fileUrl = URL.createObjectURL(file);

      this.documentModalService.open({
        url: fileUrl,
        documentName: `offer_letter_${candidate.referenceNo}`,
        extension: 'pdf',
        downloadAccess: true,
      });
    } catch (error: any) {
      this.alertService.error('Failed', error?.error?.message ?? 'Unable to load offer letter.');
    }
  }

  // ============================================================
  // ADDITIONAL INFO - opens the joining information form, which saves the candidate as an employee
  // ============================================================

  onEditCandidateDetails() {
    const candidate = this.getCandidate();

    if (!candidate) return;

    this.onEditDetails.emit(candidate.id);
  }

  onAddAdditionalInfo() {
    const candidate = this.getCandidate();

    if (!candidate) return;

    this.onUpdateAction.emit(candidate);
  }

  // ============================================================
  // APPOINTMENT LETTER
  // ============================================================

  async onViewAppointmentLetterMail() {
    const candidate = this.getCandidate();

    if (!candidate) return;

    try {
      const file = await firstValueFrom(this.hrReportService.getAppointmentLetter(candidate.id));
      const fileUrl = URL.createObjectURL(file);

      this.documentModalService.open({
        url: fileUrl,
        documentName: `appointment_letter_${candidate.referenceNo}`,
        extension: 'pdf',
        downloadAccess: true,
      });
    } catch (error: any) {
      this.alertService.error(
        'Failed',
        error?.error?.message ?? 'Unable to load appointment letter.',
      );
    }
  }

  // ============================================================
  // JOINING LETTER
  // ============================================================

  async onDownloadJoiningLetter() {
    const candidate = this.getCandidate();

    if (!candidate) return;

    try {
      const file = await firstValueFrom(this.hrReportService.getJoiningLetter(candidate.id));
      const fileUrl = URL.createObjectURL(file);

      this.documentModalService.open({
        url: fileUrl,
        documentName: `joining_letter_${candidate.referenceNo}`,
        extension: 'pdf',
        downloadAccess: true,
      });
    } catch (error: any) {
      this.alertService.error('Failed', error?.error?.message ?? 'Unable to load joining letter.');
    }
  }

  /** The file arrives already picked and previewed in qfin-file-actions' upload dialog. */
  onJoiningLetterUpload(file: File) {
    const candidate = this.getCandidate();

    if (!candidate) {
      return;
    }

    this.uploadingJoiningLetter.set(true);

    this.candidateService.uploadJoiningLetter(candidate.id, file).subscribe({
      next: () => {
        this.alertService.success('Success', 'Joining letter uploaded successfully');
        this.candidateStore.refreshDetail();
      },
      error: (error: any) =>
        this.alertService.error(
          'Failed',
          error?.error?.message ?? 'Unable to upload joining letter.',
        ),
      complete: () => this.uploadingJoiningLetter.set(false),
    });
  }

  // ============================================================
  // WELCOME LETTER
  // ============================================================

  async onViewWelcomeLetterMail() {
    const candidate = this.getCandidate();

    if (!candidate) return;

    try {
      const file = await firstValueFrom(this.hrReportService.getWelcomeLetter(candidate.id));
      const fileUrl = URL.createObjectURL(file);

      this.documentModalService.open({
        url: fileUrl,
        documentName: `welcome_letter_${candidate.referenceNo}`,
        extension: 'pdf',
        downloadAccess: true,
      });
    } catch (error: any) {
      this.alertService.error('Failed', error?.error?.message ?? 'Unable to load welcome letter.');
    }
  }

  async onReject() {
    const candidate = this.getCandidate();

    if (!candidate || this.candidateId() === EMPTY_UUID || this.rejecting()) return;

    const result = await this.alertService.confirm(
      'Reject Candidate?',
      `${candidate.candidateFullName || 'This candidate'} will be rejected and the interview process will stop. This cannot be undone.`,
      'Yes, reject',
      'Cancel',
    );

    if (!result.isConfirmed) return;

    this.rejecting.set(true);
    this.candidateService.rejectCandidate(this.candidateId()).subscribe({
      next: (message: any) => {
        this.rejecting.set(false);
        this.alertService.success('Rejected', typeof message === 'string' ? message : 'Candidate rejected.');
        this.candidateStore.refreshDetail();
        this.candidateStore.refreshList();
      },
      error: (error) => {
        this.rejecting.set(false);
        // A 403 carries no body - HR, or the candidate's creator before HR starts the assessment.
        const message =
          error?.status === 403
            ? 'You can no longer reject this candidate.'
            : (error?.error?.message ?? error?.error?.detail ?? 'Failed to reject the candidate.');
        this.alertService.error('Failed', message);
      },
    });
  }

  // ============================================================
  // CANDIDATE SELECTION
  // ============================================================

  /** "Is Candidate Selected": HR selects the candidate for an offer after the HR Assessment. One-way - it
   * opens Candidate Verification and cannot be undone. */
  async onSelectForOffer() {
    const candidate = this.getCandidate();

    if (!candidate || this.selecting()) return;

    const result = await this.alertService.confirm(
      'Is Candidate Selected?',
      `${candidate.candidateFullName || 'This candidate'} will be selected and moved on to Candidate Verification. This cannot be undone.`,
      'Yes, selected',
      'Cancel',
    );

    if (!result.isConfirmed) return;

    this.selecting.set(true);
    this.candidateService.selectForOffer(candidate.id).subscribe({
      next: (message: any) => {
        this.selecting.set(false);
        this.alertService.success('Selected', typeof message === 'string' ? message : 'Candidate selected.');
        this.candidateStore.refreshDetail();
        this.candidateStore.refreshList();
      },
      error: (error) => {
        this.selecting.set(false);
        this.alertService.error('Failed', error?.error?.message ?? error?.error?.detail ?? 'Failed to select the candidate.');
      },
    });
  }

  // ============================================================
  // CANDIDATE VERIFICATION
  // ============================================================

  onCandidateVerification() {
    const candidate = this.getCandidate();

    if (!candidate) return;

    const dialogRef = this.dialog.open(CandidateVerificationDetail, {
      width: '1000px',
      maxWidth: '95vw',
      maxHeight: '95vh',
      panelClass: ['glass-modal', 'slide-in-up'],
    });

    if (dialogRef.componentInstance) {
      dialogRef.componentRef?.setInput('candidateId', candidate.id);
    }

    dialogRef.afterClosed().subscribe(() => {
      this.candidateStore.refreshDetail();
    });
  }

  // ============================================================
  // HR ASSESSMENT
  // ============================================================

  onHrAssessment() {
    const candidate = this.getCandidate();

    if (!candidate) return;

    const dialogRef = this.dialog.open(HrAssessmentForm, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: ['glass-modal', 'slide-in-up'],
      data: {
        candidateId: candidate.id,
        candidateName:
          candidate.firstName +
          ' ' +
          (candidate.middleName ? candidate.middleName + ' ' : '') +
          candidate.lastName,
        interviewPostName: candidate.interviewPostName,
        departmentName: candidate.departmentName,
        interviewDate: candidate.interviewDate,
        interviewMode: candidate.interviewMode,
      },
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) {
        this.alertService.success('Success', 'HR Assessment completed');
        this.candidateStore.refreshList();
      }
      this.candidateStore.refreshDetail();
    });
  }

  // ============================================================
  // INTERVIEW UPLOAD
  // ============================================================

  /** Downloads the blank WeGrow personality/written-interview form and opens it in the document modal. */
  async onDownloadInterviewFormat() {
    const candidate = this.getCandidate();

    if (!candidate) return;

    try {
      const file = await firstValueFrom(this.hrReportService.getPersonalityForm(candidate.id));
      const fileUrl = URL.createObjectURL(file);

      this.documentModalService.open({
        url: fileUrl,
        documentName: `interview_format_${candidate.referenceNo}`,
        extension: 'pdf',
        downloadAccess: true,
      });
    } catch (error: any) {
      this.alertService.error(
        'Failed',
        error?.error?.message ?? 'Unable to load interview format.',
      );
    }
  }

  /** The file arrives already picked and previewed in qfin-file-actions' upload dialog. */
  onInterviewUpload(file: File) {
    const candidate = this.getCandidate();

    if (!candidate) {
      return;
    }

    this.uploadingInterviewFormat.set(true);

    this.candidateService.uploadInterviewFormat(candidate.id, file).subscribe({
      next: () => {
        this.alertService.success('Success', 'Interview format uploaded successfully');
        this.candidateStore.refreshDetail();
      },
      error: (error: any) =>
        this.alertService.error(
          'Failed',
          error?.error?.message ?? 'Unable to upload interview format.',
        ),
      complete: () => this.uploadingInterviewFormat.set(false),
    });
  }

  // ============================================================
  // CREATE INTERVIEW PANEL
  // ============================================================

  onCreatePanel() {
    const candidateData = this.candidate();

    if (!candidateData) {
      return;
    }

    const dialogRef = this.dialog.open(InterviewPanelDetail, {
      width: '800px',
      disableClose: true,
      panelClass: 'glass-modal',
    });

    if (dialogRef.componentInstance) {
      dialogRef.componentRef?.setInput('candidateIdForPanel', candidateData.id);
      dialogRef.componentRef?.setInput('interviewDate', candidateData.interviewDate);
      dialogRef.componentRef?.setInput('interviewTime', candidateData.interviewTime);

      const sub1 = dialogRef.componentInstance.cancel.subscribe(() => dialogRef.close());
      const sub2 = dialogRef.componentInstance.save.subscribe(() => {
        dialogRef.close();

        // Refresh Candidate View
        this.candidateStore.setCandidateId(this.candidateId());
      });

      dialogRef.afterClosed().subscribe(() => {
        sub1.unsubscribe();
        sub2.unsubscribe();
        this.candidateStore.refreshDetail();
      });
    }
  }

  // ============================================================
  // VIEW EXISTING PANEL
  // ============================================================

  onViewPanel() {
    const candidateData = this.candidate();

    if (!candidateData) {
      return;
    }

    const dialogRef = this.dialog.open(InterviewPanelDetail, {
      width: '640px',
      maxWidth: '95vw',
      disableClose: true,
      panelClass: 'glass-modal',
    });

    if (dialogRef.componentInstance) {
      dialogRef.componentRef?.setInput('candidateIdForPanel', candidateData.id);
      dialogRef.componentRef?.setInput('isViewMode', true);
      dialogRef.componentRef?.setInput('canModifyPanel', !!candidateData.canModifyPanel);
      dialogRef.componentRef?.setInput('interviewDate', candidateData.interviewDate);
      dialogRef.componentRef?.setInput('interviewTime', candidateData.interviewTime);

      const sub1 = dialogRef.componentInstance.cancel.subscribe(() => dialogRef.close());

      dialogRef.afterClosed().subscribe(() => {
        sub1.unsubscribe();
        this.candidateStore.refreshDetail();
      });
    }
  }
  onOpenUpdatePage() {
    const candidate = this.getCandidate();

    if (!candidate) {
      return;
    }

    // this.onUpdateAction.emit(candidate);
  }
}
