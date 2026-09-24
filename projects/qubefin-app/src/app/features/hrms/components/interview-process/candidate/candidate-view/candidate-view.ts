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
import { InterviewPanelService } from '../../../../services/interview-panel-service';
import { InterviewPanelStore } from '../../../../stores/interview-panel-store';
import { HrmsReportService } from '../../../../../Report/Service/hrms-report-service';
import { CandidateService } from '../../../../services/candidate-service';
import { Observable, firstValueFrom } from 'rxjs';
import { ICandidate } from '../../../../models/candidate';

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
  private readonly panelService = inject(InterviewPanelService);
  private readonly documentModalService = inject(DocumentModalService);
  private readonly hrReportService = inject(HrmsReportService);
  private readonly candidateService = inject(CandidateService);
  private readonly panelStore = inject(InterviewPanelStore);
  private readonly alertService = inject(AlertService);
  readonly dialog = inject(MatDialog);
  onUpdateAction = output<ICandidate>();
  readonly candidateId = model<string>(EMPTY_UUID);

  readonly candidate = this.candidateStore.candidate;
  readonly loading = this.candidateStore.candidateLoading;
  readonly error = this.candidateStore.candidateError;

  readonly sendingMail = signal(false);
  readonly recievingMail = signal(false);
  readonly uploadingInterviewFormat = signal(false);
  readonly uploadingJoiningLetter = signal(false);

  constructor() {
    effect(() => {
      this.candidateStore.setCandidateId(this.candidateId());
    });
  }

  // ============================================================
  // ACTION VISIBILITY
  //
  // Role on a candidate comes from Tbl_InterviewPanel.AssessmentType, surfaced
  // by the GetById SP as isCurrentEmployeePanelMember ('INTERVIEWER' row) and
  // isCurrentEmployeeHrAssessor ('HR' row). `isHR` is a PERMISSION flag only -
  // never treat it as "this person is an interviewer", and never treat holding
  // the HR assessment row as panel membership.
  // ============================================================

  /** The signed-in employee is scheduled on this candidate's panel as an interviewer. */
  readonly isPanelInterviewer = computed(() => !!this.candidate()?.isCurrentEmployeePanelMember);

  /** The signed-in employee owns this candidate's HR Assessment row. Can be true at the same time as
   * isPanelInterviewer() - HR sitting on the panel holds both rows. */
  readonly isHrAssessor = computed(() => !!this.candidate()?.isCurrentEmployeeHrAssessor);

  readonly showAcknowledgeButton = computed(() => {
    const data = this.candidate();
    return (
      !!data?.isCurrentEmployeePanelMember &&
      !!data.isInterviewLetterReceived &&
      !!data.canAcknowledgePanel
    );
  });

  /** The interviewer assessment is still outstanding for the signed-in panel member. */
  private readonly interviewerAssessmentPending = computed(() => {
    const data = this.candidate();
    return (
      !!data?.isCurrentEmployeePanelMember &&
      !!data.isInterviewerAcknowledged &&
      !data.isCurrentEmployeeAssessmentSubmitted
    );
  });

  readonly showStartAssessmentButton = computed(
    () => this.interviewerAssessmentPending() && !!this.candidate()?.isAssessmentDate,
  );

  /** "Interview is tomorrow" / "Interview after N days" - shown instead of the button off the day. */
  readonly showAssessmentDateMessage = computed(
    () => this.interviewerAssessmentPending() && !this.candidate()?.isAssessmentDate,
  );

  /** Sequenced server-side. The old client-side gate ("HR Assessment button hidden") was also true
   * AFTER the assessment completed, which brought these buttons back at the end of the workflow. */
  readonly showInterviewFormatActions = computed(
    () => !!this.candidate()?.showInterviewFormatActions,
  );

  /** Sequenced server-side, like the rest of the letter chain. */
  readonly showInterviewLetterActions = computed(
    () => !!this.candidate()?.showInterviewLetterActions,
  );

  /** A saved-but-unsubmitted HR Assessment reopens the same form, so say so on the button. */
  readonly hrAssessmentButtonLabel = computed(() =>
    this.candidate()?.isHrAssessmentDraftSaved ? 'Continue HR Assessment' : 'HR Assessment',
  );

  /** Is there anything at all for this user to do on this candidate? The Actions card carries no status
   * badges - completed steps are reported by the Workflow Path panel - so when every gate is closed the
   * card would otherwise render empty. */
  readonly hasAnyAction = computed(() => {
    const data = this.candidate();
    if (!data) {
      return false;
    }

    return (
      this.showAcknowledgeButton() ||
      this.showInterviewFormatActions() ||
      this.showInterviewLetterActions() ||
      this.showStartAssessmentButton() ||
      this.showAssessmentDateMessage() ||
      !!data.showCreatePanelButton ||
      (!!data.isPanelCreated && !!data.showViewPanelButton) ||
      !!data.isShowHrAssessmentButton ||
      !!data.isShowCandidateVerificationButton ||
      !!data.showOfferLetterActions ||
      !!data.showAddAdditionalInfoButton ||
      !!data.showAppointmentLetterActions ||
      !!data.showJoiningLetterActions ||
      !!data.showWelcomeLetterActions
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

  onAcknowledge() {
    const candidate = this.getCandidate();

    if (!candidate) return;

    if (this.candidateId() === EMPTY_UUID) return;
    (this.panelService.acknowledgePanel(this.candidateId()) as any).subscribe({
      next: () => {
        this.alertService.success('Success', 'Panel Acknowledged');
        this.panelStore.refreshPanels();
        this.candidateStore.refreshDetail();
      },
      error: () => this.alertService.error('Error', 'Failed to acknowledge panel'),
    });
  }

  // ============================================================
  // WRITTEN / INITIAL ASSESSMENT
  // ============================================================

  onStartAssessment() {
    const candidateData = this.candidate();

    if (!candidateData) return;

    console.log('Start Assessment:', candidateData.id);

    const dialogRef = this.dialog.open(InterviewPanelDetail, {
      width: '1200px',
      maxWidth: '95vw',
      disableClose: true,
      panelClass: 'glass-modal',
    });

    if (dialogRef.componentInstance) {
      dialogRef.componentRef?.setInput('candidateIdForPanel', candidateData.id);
      dialogRef.componentRef?.setInput('interviewDate', candidateData.interviewDate);
      dialogRef.componentRef?.setInput('interviewTime', candidateData.interviewTime);
      dialogRef.componentRef?.setInput('isAssessmentMode', true);

      if ((candidateData as any).panelId) {
        dialogRef.componentRef?.setInput('panelId', (candidateData as any).panelId);
      } else if ((candidateData as any).interviewPanelId) {
        dialogRef.componentRef?.setInput('panelId', (candidateData as any).interviewPanelId);
      }

      const sub1 = dialogRef.componentInstance.cancel.subscribe(() => dialogRef.close());
      const sub2 = dialogRef.componentInstance.save.subscribe(() => {
        dialogRef.close();
      });

      dialogRef.afterClosed().subscribe(() => {
        sub1.unsubscribe();
        sub2.unsubscribe();
        this.candidateStore.refreshDetail();
      });
    }
  }

  // ============================================================
  // CANDIDATE VERIFICATION
  // ============================================================

  onCandidateVerification() {
    const candidate = this.getCandidate();

    if (!candidate) return;

    console.log('Candidate Verification:', candidate.id);

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

    console.log('HR Assessment:', candidate.id);

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
      dialogRef.componentRef?.setInput('isAssessmentMode', false);

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
  getAssessmentMessage(interviewDate: string | Date): string {
    const today = new Date();
    const interview = new Date(interviewDate);

    today.setHours(0, 0, 0, 0);
    interview.setHours(0, 0, 0, 0);

    const diffTime = interview.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      if (diffDays === 1) {
        return 'Interview is tomorrow.';
      }

      return `Interview after ${diffDays} days.`;
    }

    if (diffDays < 0) {
      return 'Interview date has passed.';
    }

    return '';
  }

  // ============================================================
  // VIEW EXISTING PANEL
  // ============================================================

  onViewPanel() {
    const candidateData = this.candidate();

    if (!candidateData) {
      return;
    }

    console.log('View Interview Panel:', candidateData.id);

    const dialogRef = this.dialog.open(InterviewPanelDetail, {
      width: '900px',
      maxWidth: '75vw',
      disableClose: true,
      panelClass: 'glass-modal',
    });

    if (dialogRef.componentInstance) {
      dialogRef.componentRef?.setInput('candidateIdForPanel', candidateData.id);
      dialogRef.componentRef?.setInput('isViewMode', true);
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
