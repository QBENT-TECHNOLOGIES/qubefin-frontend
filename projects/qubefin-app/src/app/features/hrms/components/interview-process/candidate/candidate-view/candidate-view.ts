import { Component, computed, effect, inject, model, signal } from '@angular/core';

import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { LucideDynamicIcon } from '@lucide/angular';

import { AlertService, DocumentModalService, EMPTY_UUID } from 'qubefin-core';

import { CandidateStore } from '../../../../stores/candidate-store';
import { InterviewPanelDetail } from '../interview-panel-detail/interview-panel-detail';
import { HrAssessmentForm } from '../hr-assessment-form/hr-assessment-form';
import { CandidateVerificationDetail } from '../candidate-verification/candidate-verification-detail';
import { InterviewPanelService } from '../../../../services/interview-panel-service';
import { InterviewPanelStore } from '../../../../stores/interview-panel-store';
import { HrmsReportService } from '../../../../../Report/Service/hrms-report-service';
import { CandidateService } from '../../../../services/candidate-service';
import { firstValueFrom } from 'rxjs';

interface WorkflowStage {
  label: string;
  icon: string;
  done: boolean;
  current: boolean;
}

@Component({
  selector: 'qfin-candidate-view',
  imports: [DatePipe, LucideDynamicIcon, MatButtonModule, MatCheckboxModule],
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

  readonly candidateId = model<string>(EMPTY_UUID);

  readonly candidate = this.candidateStore.candidate;
  readonly loading = this.candidateStore.candidateLoading;
  readonly error = this.candidateStore.candidateError;

  readonly sendingInterviewLetterMail = signal(false);
  readonly sendingOfferLetterMail = signal(false);
  readonly uploadingInterviewFormat = signal(false);

  constructor() {
    effect(() => {
      this.candidateStore.setCandidateId(this.candidateId());
    });
  }

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
        label: 'Acknowledge',
        icon: 'badge-check',
        done: !!data.isInterviewerAcknowledged,
      },
      {
        label: 'Panel Creation',
        icon: 'users-round',
        done: !!data.isPanelCreated,
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
        done: !!data.isOfferLetterGenerated,
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

  onPrintInterviewLetter() {
    const candidate = this.getCandidate();

    if (!candidate) return;

    console.log('Print Interview Letter:', candidate.id);

    // TODO:
    // Call print interview letter API
  }

  async onViewInterviewLetterMail() {
    const candidate = this.getCandidate();

    if (!candidate) return;

    try {
      const file = await firstValueFrom(
        this.hrReportService.getWegrowInterviewLetter(candidate.id),
      );
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

  onSendInterviewLetterMail() {
    const candidate = this.getCandidate();

    if (!candidate) return;

    this.sendingInterviewLetterMail.set(true);

    this.candidateService
      .updateLetterStatus(candidate.id, { isInterviewLetterReceived: true })
      .subscribe({
        next: () => {
          this.alertService.success('Success', 'Interview letter mail sent');
          this.candidateStore.refreshDetail();
        },
        error: (error: any) =>
          this.alertService.error(
            'Failed',
            error?.error?.message ?? 'Unable to send interview letter mail.',
          ),
        complete: () => this.sendingInterviewLetterMail.set(false),
      });
  }

  // ============================================================
  // OFFER LETTER
  // ============================================================

  async onViewOfferLetterMail() {
    const candidate = this.getCandidate();

    if (!candidate) return;

    try {
      const file = await firstValueFrom(this.hrReportService.getWegrowOfferLetter(candidate.id));
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

  onSendOfferLetterMail() {
    const candidate = this.getCandidate();

    if (!candidate) return;

    this.sendingOfferLetterMail.set(true);

    this.candidateService
      .updateLetterStatus(candidate.id, { isOfferLetterReceived: true })
      .subscribe({
        next: () => {
          this.alertService.success('Success', 'Offer letter mail sent');
          this.candidateStore.refreshDetail();
        },
        error: (error: any) =>
          this.alertService.error(
            'Failed',
            error?.error?.message ?? 'Unable to send offer letter mail.',
          ),
        complete: () => this.sendingOfferLetterMail.set(false),
      });
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
      const file = await firstValueFrom(this.hrReportService.getWegrowPersonalityForm(candidate.id));
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

  onInterviewUpload(event: Event) {
    const element = event.currentTarget as HTMLInputElement;

    const fileList = element.files;

    if (!fileList || fileList.length === 0) {
      return;
    }

    const file = fileList[0];
    const candidate = this.getCandidate();

    if (!candidate) {
      element.value = '';
      return;
    }

    // Preview the selected file straight away so the user can confirm it before it finishes uploading.
    const previewUrl = URL.createObjectURL(file);
    const extension = file.name.split('.').pop()?.toLowerCase() || 'pdf';

    this.documentModalService.open({
      url: previewUrl,
      documentName: file.name,
      extension,
      downloadAccess: true,
    });

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
      complete: () => {
        this.uploadingInterviewFormat.set(false);
        element.value = '';
      },
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
      });
    }
  }
}
