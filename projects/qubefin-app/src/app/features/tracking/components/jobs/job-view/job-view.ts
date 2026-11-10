import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import { ExtendJobRequest, JobHistoryAction, JobTask, NewTaskInput, TransferJobRequest } from '../../../models/job';
import { JobService } from '../../../services/job-service';
import { JobStore } from '../../../stores/job-store';
import { TrackingLookupStore } from '../../../stores/tracking-lookup-store';
import { googleMapsLink, toDateKey } from '../../../utils/geo-utils';
import { isOpenJob } from '../../../utils/job-rules';
import { JOB_STATUS, JOB_TASK_STATUS, ROLE_LABEL, TASK_PRIORITY, TASK_TYPE } from '../../../utils/tracking-labels';
import { RemarksDialog, RemarksDialogData } from '../../shared/remarks-dialog/remarks-dialog';
import { TrackingChip } from '../../shared/tracking-chip/tracking-chip';
import { TaskEvidence } from '../../tasks/task-evidence/task-evidence';
import { AddTasksDialog } from '../add-tasks-dialog/add-tasks-dialog';
import { ExtendJobDialog } from '../extend-job-dialog/extend-job-dialog';
import { TransferJobDialog, TransferJobDialogData } from '../transfer-job-dialog/transfer-job-dialog';

const HISTORY: Record<JobHistoryAction, { label: string; icon: string }> = {
  Created: { label: 'Created', icon: 'plus' },
  Transferred: { label: 'Job transferred', icon: 'arrow-right-left' },
  TasksTransferredOut: { label: 'Tasks moved out', icon: 'arrow-right' },
  TasksTransferredIn: { label: 'Tasks moved in', icon: 'arrow-left' },
  TasksAdded: { label: 'Tasks added', icon: 'list-plus' },
  TaskSelfAdded: { label: 'Task added from mobile', icon: 'smartphone' },
  TaskCompleted: { label: 'Task completed', icon: 'circle-check' },
  TaskCancelled: { label: 'Task cancelled', icon: 'x' },
  TaskRejected: { label: 'Self-added task rejected', icon: 'circle-x' },
  DateExtended: { label: 'Date extended', icon: 'calendar-plus' },
  BecameDelayed: { label: 'Became delayed', icon: 'hourglass' },
  Completed: { label: 'Job completed', icon: 'badge-check' },
  Cancelled: { label: 'Job cancelled', icon: 'ban' },
};

type TaskTab = 'all' | 'Pending' | 'Completed' | 'closed';

@Component({
  selector: 'qfin-job-view',
  imports: [DatePipe, RouterLink, MatTooltipModule, LucideDynamicIcon, TrackingChip, TaskEvidence],
  templateUrl: './job-view.html',
})
export class JobView {
  private readonly store = inject(JobStore);
  private readonly service = inject(JobService);
  private readonly alerts = inject(AlertService);
  private readonly dialog = inject(MatDialog);
  private readonly lookup = inject(TrackingLookupStore);

  readonly jobId = input<string>(EMPTY_UUID);
  readonly changed = output<void>();
  readonly openJob = output<string>();

  readonly job = this.store.job;
  readonly history = this.store.history;

  readonly JOB_STATUS = JOB_STATUS;
  readonly JOB_TASK_STATUS = JOB_TASK_STATUS;
  readonly TASK_TYPE = TASK_TYPE;
  readonly TASK_PRIORITY = TASK_PRIORITY;
  readonly ROLE_LABEL = ROLE_LABEL;
  readonly HISTORY = HISTORY;
  readonly googleMapsLink = googleMapsLink;
  readonly today = toDateKey();

  readonly tab = signal<TaskTab>('all');
  readonly expandedId = signal<string | null>(null);

  readonly isOpen = computed(() => !!this.job() && isOpenJob(this.job()!.status));
  /** Why some or all actions are missing for this user (the server decides via `job.permissions`). */
  readonly accessNote = computed(() => {
    const j = this.job();
    if (!j) return null;
    const p = j.permissions;
    if (j.assigneeId === this.lookup.viewer()?.employeeId) {
      return 'This job is assigned to you. Work cannot be transferred or delegated; new tasks for your own job are added from the mobile app.';
    }
    if (!p.canUpdate) return `View only. ${j.createdByName} (who created the job) or someone above them can change it.`;
    if (p.canUpdate && !p.canCancel) return `You can add tasks and extend the date. Only ${j.createdByName} or someone above them can transfer or cancel this job.`;
    return null;
  });

  readonly pct = computed(() => {
    const j = this.job();
    return j?.taskCount ? Math.round((j.doneCount / j.taskCount) * 100) : 0;
  });

  readonly tabs = computed(() => {
    const t = this.job()?.tasks ?? [];
    return [
      { key: 'all' as TaskTab, label: 'All', count: t.length },
      { key: 'Pending' as TaskTab, label: 'Pending', count: t.filter((x) => x.status === 'Pending').length },
      { key: 'Completed' as TaskTab, label: 'Completed', count: t.filter((x) => x.status === 'Completed').length },
      { key: 'closed' as TaskTab, label: 'Moved / closed', count: t.filter((x) => x.status !== 'Pending' && x.status !== 'Completed').length },
    ];
  });

  readonly tasks = computed(() => {
    const tab = this.tab();
    const order = { Pending: 0, Completed: 1, Transferred: 2, Rejected: 3, Cancelled: 4 } as const;
    return (this.job()?.tasks ?? [])
      .filter((t) => tab === 'all' || (tab === 'closed' ? t.status !== 'Pending' && t.status !== 'Completed' : t.status === tab))
      .sort((a, b) => order[a.status] - order[b.status] || (b.taskCompletedOn ?? '').localeCompare(a.taskCompletedOn ?? ''));
  });

  readonly daysLeft = computed(() => {
    const j = this.job();
    if (!j) return 0;
    return Math.round((new Date(`${j.endDate}T12:00:00`).getTime() - new Date(`${this.today}T12:00:00`).getTime()) / 86_400_000);
  });

  constructor() {
    effect(() => this.store.setJobId(this.jobId()));
    effect(() => {
      this.jobId();
      this.tab.set('all');
      this.expandedId.set(null);
    });
  }

  toggle(t: JobTask) {
    this.expandedId.set(this.expandedId() === t.id ? null : t.id);
  }

  // --- Job actions -----------------------------------------------------------------------------
  transfer() {
    const j = this.job();
    if (!j) return;
    this.dialog
      .open<TransferJobDialog, TransferJobDialogData, TransferJobRequest>(TransferJobDialog, { data: { job: j }, panelClass: 'glass-modal', maxWidth: '95vw' })
      .afterClosed()
      .subscribe((req) => {
        if (!req) return;
        this.service.transfer(j.id, req).subscribe(({ job, newJob, skipped }) => {
          if (skipped.length) {
            const moved = newJob ? `${newJob.taskCount} task(s) moved to ${newJob.jobCode} for ${newJob.assigneeName}.` : `${job.jobCode} transferred to ${job.assigneeName}.`;
            this.alerts.warning(`${skipped.length} task(s) not moved`, `${moved} Not moved (they stay in ${j.jobCode}): ${skipped.map((s) => `${s.title} – ${s.reason}`).join(' · ')}`);
          } else if (newJob) {
            this.alerts.success('Tasks transferred', `${newJob.taskCount} task(s) moved to ${newJob.jobCode} for ${newJob.assigneeName}.`);
          } else {
            this.alerts.toast('success', `${job.jobCode} transferred to ${job.assigneeName}`);
          }
          this.afterChange();
        });
      });
  }

  addTasks() {
    const j = this.job();
    if (!j) return;
    this.dialog
      .open<AddTasksDialog, { job: typeof j }, NewTaskInput[]>(AddTasksDialog, { data: { job: j }, panelClass: 'glass-modal', maxWidth: '96vw' })
      .afterClosed()
      .subscribe((tasks) => {
        if (!tasks?.length) return;
        this.service.addTasks(j.id, { tasks }).subscribe(({ skipped }) => {
          const added = tasks.length - skipped.length;
          if (skipped.length) this.alerts.warning(`${added} added, ${skipped.length} skipped`, skipped.map((s) => `${s.title} – ${s.reason}`).join(' · '));
          else this.alerts.toast('success', `${added} task(s) added`);
          // Warnings ("also pending with …") were confirmed in the dialog already.
          this.afterChange();
        });
      });
  }

  extend() {
    const j = this.job();
    if (!j) return;
    this.dialog
      .open<ExtendJobDialog, { job: typeof j }, ExtendJobRequest>(ExtendJobDialog, { data: { job: j }, panelClass: 'glass-modal', maxWidth: '95vw' })
      .afterClosed()
      .subscribe((req) => {
        if (!req) return;
        this.service.extend(j.id, req).subscribe((job) => {
          this.alerts.toast('success', `${job.jobCode} now due ${job.endDate}`);
          this.afterChange();
        });
      });
  }

  cancelJob() {
    const j = this.job();
    if (!j) return;
    this.askRemarks({
      title: `Cancel ${j.jobCode}?`,
      message: `${j.openCount} pending task(s) will be cancelled. Completed tasks stay on record.`,
      label: 'Reason for cancelling',
      confirmText: 'Cancel job',
      icon: 'ban',
      tone: 'danger',
    }).subscribe((remarks) => {
      if (!remarks) return;
      this.service.cancel(j.id, { remarks }).subscribe(() => {
        this.alerts.toast('success', `${j.jobCode} cancelled`);
        this.afterChange();
      });
    });
  }

  // --- Task actions ----------------------------------------------------------------------------
  cancelTask(t: JobTask) {
    const j = this.job();
    if (!j) return;
    this.askRemarks({ title: `Cancel ${t.taskNo}?`, message: t.taskTitle, label: 'Reason', confirmText: 'Cancel task', icon: 'x', tone: 'danger' }).subscribe((remarks) => {
      if (!remarks) return;
      this.service.cancelTask(j.id, t.id, { remarks }).subscribe(() => {
        this.alerts.toast('success', `${t.taskNo} cancelled`);
        this.afterChange();
      });
    });
  }

  rejectTask(t: JobTask) {
    const j = this.job();
    if (!j) return;
    this.askRemarks({
      title: `Reject ${t.taskNo}?`,
      message: `${t.addedByName} added “${t.taskTitle}” from the mobile app. Rejecting removes it from the job.`,
      label: 'Reason',
      confirmText: 'Reject task',
      icon: 'circle-x',
      tone: 'danger',
    }).subscribe((remarks) => {
      if (!remarks) return;
      this.service.rejectTask(j.id, t.id, { remarks }).subscribe(() => {
        this.alerts.toast('success', `${t.taskNo} rejected`);
        this.afterChange();
      });
    });
  }

  private askRemarks(data: RemarksDialogData) {
    return this.dialog.open<RemarksDialog, RemarksDialogData, string>(RemarksDialog, { data, panelClass: 'glass-modal', maxWidth: '95vw' }).afterClosed();
  }

  private afterChange() {
    this.store.refreshDetail();
    this.store.refreshList();
    this.changed.emit();
  }
}
