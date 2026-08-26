import { DatePipe } from '@angular/common';
import { Component, effect, inject, model, output, signal } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { APP_ICONS_MAP } from '../../../../../lucide-icons';
import { SurveyStore } from '../../../stores/survey-store';
import { EMPTY_UUID } from 'qubefin-core';

@Component({
  selector: 'qfin-survey-unit-view',
  imports: [DatePipe, LucideDynamicIcon],
  templateUrl: './survey-unit-view.html',
  styles: ``,
})
export class SurveyUnitView {
  readonly iconMap = APP_ICONS_MAP;
  private readonly surveyStore = inject(SurveyStore);

  // Input From Parant
  readonly surveyId = model<string>(EMPTY_UUID);
  // Emit From Child
  readonly showEdit = output<void>();

  public isActive = signal<boolean>(true);

  readonly surveyUnit = this.surveyStore.surveyUnit;
  readonly loading = this.surveyStore.surveyUnitLoading;
  readonly error = this.surveyStore.surveyUnitError;

  constructor() {
    effect(() => {
      this.surveyStore.setSurveyId(this.surveyId());
    });
    effect(() => {
      const tentativeSubmissionDate = this.surveyUnit()?.tentativeSubmissionDate;

      this.isActive.set(tentativeSubmissionDate != null && tentativeSubmissionDate >= new Date());
    });

    effect(() => {
      const survey = this.surveyStore.surveyUnit();

      if (!survey) return;

      // Assign to your local array or FormArray here
      // this.members = survey.surveyAssigneds;
    });
  }

  onEdit() {
    this.showEdit.emit();
  }
}
