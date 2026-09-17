import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { InterviewPanelService } from '../../../services/interview-panel-service';
import { AlertService } from 'qubefin-core';
import { Router } from '@angular/router';

@Component({
  selector: 'qfin-my-interviews-list',
  standalone: true,
  imports: [CommonModule, MatTableModule],
  templateUrl: './my-interviews-list.html',
})
export class MyInterviewsList implements OnInit {
  private panelService = inject(InterviewPanelService);
  private alertService = inject(AlertService);
  private router = inject(Router);

  data = signal<any[]>([]);
  displayedColumns = ['candidate', 'scheduledDate', 'scheduledTime', 'status', 'action'];

  ngOnInit() {
    this.loadInterviews();
  }

  loadInterviews() {
    this.panelService.getMyInterviews().subscribe({
      next: (res: any) => {
        this.data.set(res.items || res.data || res || []);
      },
      error: () => {
        // Failing gracefully since endpoint may not exist yet on backend
        this.data.set([]);
      }
    });
  }

  onAcknowledge(id: string) {
    this.panelService.acknowledgePanel(id).subscribe({
      next: () => {
        this.alertService.success('Success', 'Invitation acknowledged successfully');
        this.loadInterviews();
      },
      error: () => {
        this.alertService.error('Error', 'Failed to acknowledge invitation');
      }
    });
  }

  onView(id: string) {
    // Navigate to interview panel details in assessment mode (which is handled by passing state/query or standard panel route)
    // For now, the existing panel route is /interview-panel
    this.router.navigate(['/interview-panel'], { queryParams: { panelId: id, mode: 'assessment' } });
  }
}
