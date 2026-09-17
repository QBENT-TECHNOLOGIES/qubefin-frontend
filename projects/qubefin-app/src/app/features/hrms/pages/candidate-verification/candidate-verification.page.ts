import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CandidateVerificationDetail } from '../../components/interview-process/candidate/candidate-verification/candidate-verification-detail';

@Component({
  selector: 'qfin-candidate-verification-page',
  standalone: true,
  imports: [CommonModule, CandidateVerificationDetail],
  template: `
    <div class="page-container">
        <div class="header-group">
            <div class="flex flex-col gap-1">
                <h1 class="text-xl font-semibold text-slate-800">Candidate Verification</h1>
                <p class="text-sm text-slate-500">Complete identity and background checks</p>
            </div>
        </div>
        <div class="p-4 md:p-6 bg-slate-50 dark:bg-slate-900/50">
            <qfin-candidate-verification-detail [candidateId]="candidateId"></qfin-candidate-verification-detail>
        </div>
    </div>
  `
})
export class CandidateVerificationPage {
  private route = inject(ActivatedRoute);
  candidateId = this.route.snapshot.paramMap.get('id') || '';
}
