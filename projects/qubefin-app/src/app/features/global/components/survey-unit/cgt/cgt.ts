import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { LucideDynamicIcon } from '@lucide/angular';
import { CgtStore } from '../../../stores/cgt-store';
import { CgtModal } from './cgt-modal';

// CGT (Compulsory Group Training) of an Approved Group Survey: a short summary here, and the full form in a window.
// Any Credit Officer of the survey fills it in and completes it; everyone else who can see the survey reads it.
// The server decides who can write.
@Component({
  selector: 'qfin-cgt',
  imports: [DatePipe, LucideDynamicIcon],
  templateUrl: './cgt.html',
})
export class Cgt {
  private readonly store = inject(CgtStore);
  private readonly dialog = inject(MatDialog);

  readonly surveyId = input.required<string>();
  readonly data = this.store.cgt;

  // How many of the 10 topics have a Yes or No.
  readonly answered = computed(() => (this.data()?.topics ?? []).filter((t) => t.covered !== null).length);

  constructor() {
    effect(() => this.store.setSurveyId(this.surveyId()));
  }

  protected openCgt() {
    this.dialog
      .open(CgtModal, {
        data: { surveyId: this.surveyId() },
        width: '1000px',
        maxWidth: '95vw',
        panelClass: 'glass-modal',
        disableClose: true,
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) this.store.refresh();
      });
  }
}
