import { Component, effect, inject, input } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { LucideDynamicIcon } from '@lucide/angular';
import { BranchCreateStore } from '../../../stores/branch-create-store';
import { SurveyStore } from '../../../stores/survey-store';
import { CreateBranchModal } from './create-branch-modal';

// Last step of a Branch Survey: the Committee Lead creates the Branch. Afterwards the branch is shown here.
// The server decides who sees the button.
@Component({
  selector: 'qfin-branch-create',
  imports: [LucideDynamicIcon],
  templateUrl: './branch-create.html',
})
export class BranchCreate {
  private readonly store = inject(BranchCreateStore);
  private readonly surveyStore = inject(SurveyStore);
  private readonly dialog = inject(MatDialog);

  readonly surveyId = input.required<string>();
  readonly info = this.store.info;

  constructor() {
    effect(() => this.store.setSurveyId(this.surveyId()));
  }

  protected openCreate() {
    const info = this.info();
    if (!info) return;

    this.dialog
      .open(CreateBranchModal, {
        data: { surveyId: this.surveyId(), info },
        width: '1100px',
        maxWidth: '95vw',
        panelClass: 'glass-modal',
        disableClose: true,
      })
      .afterClosed()
      .subscribe((created) => {
        if (created) {
          // The survey is now "Branch Created", so every survey screen is reloaded.
          this.store.refresh();
          this.surveyStore.refreshList();
          this.surveyStore.refreshDetail();
        }
      });
  }
}
