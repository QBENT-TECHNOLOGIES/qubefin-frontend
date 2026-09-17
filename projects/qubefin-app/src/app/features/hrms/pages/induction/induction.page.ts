import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { InductionDetail } from '../../components/induction/induction-detail/induction-detail';

@Component({
  selector: 'qfin-induction-page',
  standalone: true,
  imports: [CommonModule, InductionDetail],
  template: `
    <div class="page-container">
        <div class="header-group">
            <div class="flex flex-col gap-1">
                <h1 class="text-xl font-semibold text-slate-800">Employee Induction</h1>
                <p class="text-sm text-slate-500">Complete induction checklists and feedback</p>
            </div>
        </div>
        <div class="p-4 md:p-6 bg-slate-50 dark:bg-slate-900/50">
            <qfin-induction-detail [candidateId]="candidateId"></qfin-induction-detail>
        </div>
    </div>
  `
})
export class InductionPage {
  private route = inject(ActivatedRoute);
  candidateId = this.route.snapshot.paramMap.get('id') || '';
}
