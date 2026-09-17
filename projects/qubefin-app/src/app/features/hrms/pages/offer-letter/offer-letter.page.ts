import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { OfferLetterDetail } from '../../components/offer-letter/offer-letter-detail/offer-letter-detail';

@Component({
  selector: 'qfin-offer-letter-page',
  standalone: true,
  imports: [CommonModule, OfferLetterDetail],
  template: `
    <div class="page-container">
        <div class="header-group">
            <div class="flex flex-col gap-1">
                <h1 class="text-xl font-semibold text-slate-800">Offer Letter Generation</h1>
                <p class="text-sm text-slate-500">Generate, preview and send offer letter to candidate</p>
            </div>
        </div>
        <div class="p-4 md:p-6 bg-slate-50 dark:bg-slate-900/50">
            <qfin-offer-letter-detail [candidateId]="candidateId"></qfin-offer-letter-detail>
        </div>
    </div>
  `
})
export class OfferLetterPage {
  private route = inject(ActivatedRoute);
  candidateId = this.route.snapshot.paramMap.get('id') || '';
}
