import { Component, effect, inject, model } from '@angular/core';

import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { LucideDynamicIcon } from '@lucide/angular';

import { EMPTY_UUID } from 'qubefin-core';

import { CandidateStore } from '../../../../stores/candidate-store';
import { InterviewPanelDetail } from '../interview-panel-detail/interview-panel-detail';

@Component({
  selector: 'qfin-candidate-view',
  imports: [DatePipe, LucideDynamicIcon, MatButtonModule, MatCheckboxModule],
  templateUrl: './candidate-view.html',
  styles: ``,
})
export class CandidateView {
  readonly datePipe = inject(DatePipe);
  readonly candidateStore = inject(CandidateStore);
  readonly dialog = inject(MatDialog);

  readonly candidateId = model<string>(EMPTY_UUID);

  readonly candidate = this.candidateStore.candidate;
  readonly loading = this.candidateStore.candidateLoading;
  readonly error = this.candidateStore.candidateError;

  constructor() {
    effect(() => {
      this.candidateStore.setCandidateId(this.candidateId());
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

  onPrintInterviewLetter() {
    const candidate = this.getCandidate();

    if (!candidate) return;

    console.log('Print Interview Letter:', candidate.id);

    // TODO:
    // Call print interview letter API
  }

  onSendMail() {
    const candidate = this.getCandidate();

    if (!candidate) return;

    console.log('Send Interview Letter Mail:', candidate.id);

    // TODO:
    // Call send mail API
  }

  onAcknowledge() {
    const candidate = this.getCandidate();

    if (!candidate) return;

    console.log('Acknowledge Interview Letter:', candidate.id);

    // TODO:
    // Call acknowledge API
  }

  // ============================================================
  // WRITTEN / INITIAL ASSESSMENT
  // ============================================================

  onStartAssessment() {
    const candidate = this.getCandidate();

    if (!candidate) return;

    console.log('Start Assessment:', candidate.id);

    // TODO:
    // Navigate to assessment page/dialog
  }

  // ============================================================
  // CANDIDATE VERIFICATION
  // ============================================================

  onCandidateVerification() {
    const candidate = this.getCandidate();

    if (!candidate) return;

    console.log('Candidate Verification:', candidate.id);

    // TODO:
    // Navigate to candidate verification page/dialog
  }

  // ============================================================
  // HR ASSESSMENT
  // ============================================================

  onHrAssessment() {
    const candidate = this.getCandidate();

    if (!candidate) return;

    console.log('HR Assessment:', candidate.id);

    // TODO:
    // Navigate to HR assessment
  }

  // ============================================================
  // INTERVIEW UPLOAD
  // ============================================================

  onInterviewUpload(event: Event) {
    const element = event.currentTarget as HTMLInputElement;

    const fileList = element.files;

    if (!fileList || fileList.length === 0) {
      return;
    }

    const file = fileList[0];

    console.log('File selected for Interview Upload:', file.name);

    // TODO:
    // Upload interview letter/document
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

    // TODO:
    // Open panel in view mode
  }
}
