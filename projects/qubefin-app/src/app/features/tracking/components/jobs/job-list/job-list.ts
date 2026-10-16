import { DatePipe, NgClass } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { JobSummary } from '../../../models/job';
import { JOB_STATUS, TASK_TYPE, Tone } from '../../../utils/tracking-labels';
import { toDateKey } from '../../../utils/geo-utils';
import { TrackingChip } from '../../shared/tracking-chip/tracking-chip';

@Component({
  selector: 'qfin-job-list',
  imports: [NgClass, DatePipe, MatTableModule, MatSortModule, MatTooltipModule, LucideDynamicIcon, TrackingChip],
  templateUrl: './job-list.html',
})
export class JobList {
  readonly data = input<JobSummary[]>([]);
  readonly selectedId = input<string | null>(null);
  readonly isCollapsed = input(false);
  readonly sortOn = input('completeBy');
  readonly sortDirection = input<'asc' | 'desc'>('asc');

  readonly viewDetail = output<string>();
  readonly sortChange = output<Sort>();

  /** Widened for mat-table rows, which are typed `any` in templates. */
  readonly JOB_STATUS: Record<string, Tone> = JOB_STATUS;
  readonly TASK_TYPE: Record<string, Tone> = TASK_TYPE;
  readonly today = toDateKey();

  readonly columns = computed(() =>
    this.isCollapsed() ? ['job', 'action'] : ['job', 'assigneeName', 'completeBy', 'progress', 'status', 'action'],
  );

  pct(j: JobSummary) {
    return j.taskCount ? Math.round((j.doneCount / j.taskCount) * 100) : 0;
  }

  daysLeft(j: JobSummary): number {
    const ms = new Date(`${j.completeBy}T12:00:00`).getTime() - new Date(`${this.today}T12:00:00`).getTime();
    return Math.round(ms / 86_400_000);
  }

  dueText(j: JobSummary): string {
    if (j.status === 'Completed' || j.status === 'Cancelled') return '';
    const n = this.daysLeft(j);
    if (n < 0) return `${-n} day${n === -1 ? '' : 's'} overdue`;
    if (n === 0) return 'due today';
    return `${n} day${n === 1 ? '' : 's'} left`;
  }
}
