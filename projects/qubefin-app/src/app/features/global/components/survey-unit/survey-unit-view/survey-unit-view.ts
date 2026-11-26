import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, computed, effect, inject, model, output, signal, untracked } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { GroupCreateModal } from '../group-create/group-create-modal';
import { LucideDynamicIcon } from '@lucide/angular';
import { APP_ICONS_MAP } from '../../../../../lucide-icons';
import { SurveyStore } from '../../../stores/survey-store';
import { EMPTY_UUID, StatusBadgeComponentComponent } from 'qubefin-core';
import { getSurveyStatusLabel } from '../../../models/survey';
import { AdministrativeUnitStore } from '../../../stores/administrative-unit-store';
import { AdministrativeUnitTreeNode } from '../../../models/administrative-unit-tree-node';
import { SurveyEvaluation } from '../survey-evaluation/survey-evaluation';
import { SurveyApproval } from '../survey-approval/survey-approval';
import { BranchCreate } from '../branch-create/branch-create';
import { GroupReview } from '../group-review/group-review';
import { Mobilization } from '../mobilization/mobilization';
import { Cgt } from '../cgt/cgt';
import { Grt } from '../grt/grt';
import { LocationMap } from '../location-map/location-map';
import { MobilizationStore } from '../../../stores/mobilization-store';

@Component({
  selector: 'qfin-survey-unit-view',
  imports: [DatePipe, NgTemplateOutlet, LucideDynamicIcon, StatusBadgeComponentComponent, SurveyEvaluation, SurveyApproval, BranchCreate, GroupReview, Mobilization, Cgt, Grt, LocationMap],
  templateUrl: './survey-unit-view.html',
  styles: ``,
})
export class SurveyUnitView {
  readonly iconMap = APP_ICONS_MAP;
  private readonly surveyStore = inject(SurveyStore);
  private readonly administrativeUnitStore = inject(AdministrativeUnitStore);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly mobilizationStore = inject(MobilizationStore);

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

  // Progress, shown as steps: a Branch Survey has 5, a Group Survey has 8.
  readonly branchSteps = ['Assigned', 'Draft', 'Evaluation', 'Approval', 'Branch Created'];
  readonly groupSteps = ['Assigned', 'Draft', 'Recommendation', 'Approval', 'Mobilization', 'CGT', 'GRT', 'Group Created'];
  readonly progressSteps = computed(() => (this.surveyUnit()?.surveyType === 'Group Survey' ? this.groupSteps : this.branchSteps));

  // The step the survey is on now. A value equal to the number of steps means every step is done.
  readonly currentStepIndex = computed(() => {
    // A Group Survey gets its step from the server (it depends on the borrowers, the CGT and the GRT).
    if (this.surveyUnit()?.surveyType === 'Group Survey') return this.surveyUnit()?.groupStep ?? 0;
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

  // Group Survey: tabs keep the page short. Before the survey is Approved there is only the Overview, so no tabs are shown.
  readonly tab = signal<'overview' | 'borrowers' | 'trainings' | 'group'>('overview');
  readonly showWorkTabs = computed(() => {
    const survey = this.surveyUnit();
    return survey?.surveyType === 'Group Survey' && survey.status === 'Approved';
  });
  readonly groupTabs = computed(() => [
    { key: 'overview' as const, label: 'Overview', icon: 'layout-grid', count: null as number | null },
    { key: 'borrowers' as const, label: 'Mobilization', icon: 'users', count: this.mobilizationStore.mobilization()?.borrowers.length ?? 0 },
    { key: 'trainings' as const, label: 'CGT and GRT', icon: 'clipboard-check', count: null as number | null },
    { key: 'group' as const, label: 'Group', icon: 'building-2', count: null as number | null },
  ]);

  constructor() {
    effect(() => {
      this.surveyStore.setSurveyId(this.surveyId());
    });

    effect(() => {
      const survey = this.surveyStore.surveyUnit();

      if (!survey) return;

      // Assign to your local array or FormArray here
      // this.members = survey.surveyAssigneds;
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

  // "Open in Group Master": shows the group made from this survey.
  openGroupMaster() {
    const detail = this.surveyUnit();
    if (!detail?.groupId) return;
    this.router.navigate(['/secure/global/groups'], { queryParams: { groupId: detail.groupId } });
  }

  // "Create Group": a window with the Group form and this survey already chosen.
  openCreateGroup() {
    const detail = this.surveyUnit();
    if (!detail) return;

    this.dialog
      .open(GroupCreateModal, {
        data: { surveyId: detail.id },
        width: '1100px',
        maxWidth: '95vw',
        panelClass: 'glass-modal',
        disableClose: true,
      })
      .afterClosed()
      .subscribe((created) => {
        if (created) {
          // The survey now has a group, so the survey screens and the borrower list are reloaded.
          this.mobilizationStore.refresh();
          this.surveyStore.refreshList();
          this.surveyStore.refreshDetail();
        }
      });
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
