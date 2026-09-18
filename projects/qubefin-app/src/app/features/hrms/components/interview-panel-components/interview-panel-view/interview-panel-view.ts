import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EMPTY_UUID, AlertService } from 'qubefin-core';
import { InterviewPanelService } from '../../../services/interview-panel-service';
import { InterviewPanelStore } from '../../../stores/interview-panel-store';

@Component({
  selector: 'qfin-interview-panel-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './interview-panel-view.html',
})
export class InterviewPanelView {
  private readonly panelService = inject(InterviewPanelService);
  private readonly panelStore = inject(InterviewPanelStore);
  private readonly alertService = inject(AlertService);

  readonly panelId = input<string>(EMPTY_UUID);
  readonly showAssessment = output<boolean>();

  onAcknowledge() {}

  onMarkAttendance(attended: boolean) {
    if (this.panelId() === EMPTY_UUID) return;
    (this.panelService.markAttendance(this.panelId(), attended) as any).subscribe({
      next: () => {
        this.alertService.success('Success', 'Attendance Marked');
        this.panelStore.refreshPanels();
      },
      error: () => this.alertService.error('Error', 'Failed to mark attendance'),
    });
  }

  onOpenAssessment() {
    this.showAssessment.emit(true);
  }
}
