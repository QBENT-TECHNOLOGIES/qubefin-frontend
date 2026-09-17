import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { InterviewPanelStore } from '../../stores/interview-panel-store';
import { EMPTY_UUID } from 'qubefin-core';

import { InterviewPanelList } from '../../components/interview-panel-components/interview-panel-list/interview-panel-list';
import { InterviewPanelView } from '../../components/interview-panel-components/interview-panel-view/interview-panel-view';
import { InterviewPanelDetail } from '../../components/interview-panel-components/interview-panel-detail/interview-panel-detail';

@Component({
  selector: 'qfin-interview-panel-component',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatTooltipModule,
    LucideDynamicIcon,
    InterviewPanelList,
    InterviewPanelView,
    InterviewPanelDetail,
  ],
  templateUrl: './interview-panel-component.html',
})
export class InterviewPanelComponent {
  public readonly EMPTY_UUID = EMPTY_UUID;
  readonly panelStore = inject(InterviewPanelStore);

  readonly selectedPanelId = signal<string>(EMPTY_UUID);
  readonly isViewMode = signal<boolean>(true);
  readonly isAssessmentMode = signal<boolean>(false);

  readonly candidateIdForPanel = signal<string>('CA7105B1-CDE3-4E1A-968A-47281AF2E27B');

  readonly panels = this.panelStore.panels;

  readonly hasSelectedPanel = computed(
    () => this.selectedPanelId() !== EMPTY_UUID || !this.isViewMode() || this.isAssessmentMode(),
  );

  constructor() {
    this.panelStore.setCandidateId(this.candidateIdForPanel());
  }

  protected onView(id: string) {
    this.selectedPanelId.set(id);
    this.isViewMode.set(true);
    this.isAssessmentMode.set(false);
  }

  protected onSchedule() {
    this.isViewMode.set(false);
    this.isAssessmentMode.set(false);
    this.selectedPanelId.set(EMPTY_UUID);
  }

  protected onOpenAssessment() {
    this.isViewMode.set(false);
    this.isAssessmentMode.set(true);
  }

  protected closePanel() {
    this.selectedPanelId.set(EMPTY_UUID);
    this.isViewMode.set(true);
    this.isAssessmentMode.set(false);
  }
}
