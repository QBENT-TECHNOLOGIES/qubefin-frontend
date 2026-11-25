import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { LucideDynamicIcon } from '@lucide/angular';
import { GrtStore } from '../../../stores/grt-store';
import { GrtModal } from './grt-modal';

// GRT (Group Recognition Test) of an Approved Group Survey: a short summary here, and the full form in a window.
// The Head of the branch fills it in once the CGT is Completed; everyone else who can see the survey reads it.
// The server decides who can write.
@Component({
  selector: 'qfin-grt',
  imports: [DatePipe, LucideDynamicIcon],
  templateUrl: './grt.html',
})
export class Grt {
  private readonly store = inject(GrtStore);
  private readonly dialog = inject(MatDialog);

  readonly surveyId = input.required<string>();
  readonly data = this.store.grt;

  // How many of the 8 components have a Yes or No.
  readonly answered = computed(() => (this.data()?.components ?? []).filter((c) => c.verified !== null).length);

  constructor() {
    effect(() => this.store.setSurveyId(this.surveyId()));
  }

  protected openGrt() {
    this.dialog
      .open(GrtModal, {
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
