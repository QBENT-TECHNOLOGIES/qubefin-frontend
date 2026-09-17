import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AppointmentJoiningDetail } from '../../components/appointment-joining/appointment-joining-detail/appointment-joining-detail';

@Component({
  selector: 'qfin-appointment-joining-page',
  standalone: true,
  imports: [CommonModule, AppointmentJoiningDetail],
  template: `
    <div class="page-container">
        <div class="header-group">
            <div class="flex flex-col gap-1">
                <h1 class="text-xl font-semibold text-slate-800">Appointment & Joining</h1>
                <p class="text-sm text-slate-500">Generate appointment letter and complete HR joining formalities</p>
            </div>
        </div>
        <div class="p-4 md:p-6 bg-slate-50 dark:bg-slate-900/50">
            <qfin-appointment-joining-detail [candidateId]="candidateId"></qfin-appointment-joining-detail>
        </div>
    </div>
  `
})
export class AppointmentJoiningPage {
  private route = inject(ActivatedRoute);
  candidateId = this.route.snapshot.paramMap.get('id') || '';
}
