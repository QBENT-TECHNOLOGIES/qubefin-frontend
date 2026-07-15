import { DatePipe } from '@angular/common';
import { Component, effect, inject, model, output } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { EMPTY_UUID } from 'qubefin-core';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { SurveyCommitteeStore } from '../../stores/survey-committee-store';

@Component({
  selector: 'qfin-survey-committee-unit-view',
  imports: [DatePipe, LucideDynamicIcon],
  templateUrl: './survey-committee-unit-view.html',
  styles: ``,
})
export class SurveyCommitteeUnitView {
  private readonly surveyCommitteeStore = inject(SurveyCommitteeStore);
  readonly committeeMemberId = model<string>(EMPTY_UUID);
  readonly showEdit = output<void>();
  readonly iconMap = APP_ICONS_MAP;
  readonly committeeMember = this.surveyCommitteeStore.surveyCommitteeUnit;
  readonly loading = this.surveyCommitteeStore.surveyCommitteeUnitLoading;
  readonly error = this.surveyCommitteeStore.surveyCommitteeUnitError;

  constructor() {
    effect(() => {
      this.surveyCommitteeStore.setSurveyCommitteeId(this.committeeMemberId());
    });
  }

  onEdit() {
    this.showEdit.emit();
  }
}
