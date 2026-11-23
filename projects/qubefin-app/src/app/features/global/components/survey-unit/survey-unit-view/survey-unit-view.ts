import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, model, output } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { APP_ICONS_MAP } from '../../../../../lucide-icons';
import { SurveyStore } from '../../../stores/survey-store';
import { EMPTY_UUID, StatusBadgeComponentComponent } from 'qubefin-core';
import { getSurveyStatusLabel } from '../../../models/survey';
import { AdministrativeUnitStore } from '../../../stores/administrative-unit-store';
import { AdministrativeUnitTreeNode } from '../../../models/administrative-unit-tree-node';
import { SurveyEvaluation } from '../survey-evaluation/survey-evaluation';
import { SurveyApproval } from '../survey-approval/survey-approval';

@Component({
  selector: 'qfin-survey-unit-view',
  imports: [DatePipe, LucideDynamicIcon, StatusBadgeComponentComponent, SurveyEvaluation, SurveyApproval],
  templateUrl: './survey-unit-view.html',
  styles: ``,
})
export class SurveyUnitView {
  readonly iconMap = APP_ICONS_MAP;
  private readonly surveyStore = inject(SurveyStore);
  private readonly administrativeUnitStore = inject(AdministrativeUnitStore);

  // Input From Parant
  readonly surveyId = model<string>(EMPTY_UUID);
  // Emit From Child
  readonly showEdit = output<void>();
  readonly viewForm = output<void>();
  readonly completeForm = output<void>();

  readonly surveyUnit = this.surveyStore.surveyUnit;
  readonly loading = this.surveyStore.surveyUnitLoading;
  readonly error = this.surveyStore.surveyUnitError;
  readonly getStatusLabel = getSurveyStatusLabel;

  // Only the Committee Lead who created the survey can edit it, until the Lead Surveyor submits. The server decides.
  readonly isEditable = computed(() => this.surveyUnit()?.canEditGeneral ?? false);

  // The area of the survey from the top (Country) down to the selected unit (State, District, Block ... Village / Ward).
  readonly areaPath = computed(() => {
    const survey = this.surveyUnit();
    if (!survey) return [];
    return this.findAreaPath(this.administrativeUnitStore.administrativeUnitTree(), survey.administrativeUnitId);
  });

  // Progress of a Branch Survey, shown as steps. Steps after "Draft" fill in as the later phases are built.
  readonly progressSteps = ['Assigned', 'Draft', 'Evaluation', 'Approval', 'Branch Created'];

  // The step the survey is on now. A value equal to the number of steps means every step is done.
  readonly currentStepIndex = computed(() => {
    switch (this.surveyUnit()?.status) {
      case 'Draft':
        return 1;
      case 'PendingEvaluation':
      case 'EvaluationInProgress':
      case 'PendingLeadEvaluation':
        return 2;
      case 'PendingApproval':
        return 3;
      case 'Approved':
        return 4;
      case 'BranchCreated':
        return 5;
      default:
        return 0;
    }
  });

  readonly isRejected = computed(() => this.surveyUnit()?.status === 'Rejected');

  readonly onShowSurveyComplete = output<{ hasAccess: boolean, type: string }>();

  constructor() {
    effect(() => {
      this.surveyStore.setSurveyId(this.surveyId());
    });

    effect(() => {
      const survey = this.surveyStore.surveyUnit();
      if (!survey) return;
      this.onShowSurveyComplete.emit({ hasAccess: survey.isSurveyAccessed, type: survey.surveyType });
    });
  }

  // Walks down the area tree and returns the units from the top level to the one with this id.
  private findAreaPath(nodes: AdministrativeUnitTreeNode[], id: string): AdministrativeUnitTreeNode[] {
    for (const node of nodes) {
      if (node.id === id) {
        return [node];
      }

      const pathBelow = this.findAreaPath(node.children ?? [], id);
      if (pathBelow.length > 0) {
        return [node, ...pathBelow];
      }
    }
    return [];
  }

  onEdit() {
    this.showEdit.emit();
  }

  onViewForm() {
    this.viewForm.emit();
  }

  onCompleteForm() {
    this.completeForm.emit();
  }
}
