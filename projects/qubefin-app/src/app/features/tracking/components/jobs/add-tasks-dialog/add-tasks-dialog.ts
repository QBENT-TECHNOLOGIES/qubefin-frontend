import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService } from 'qubefin-core';
import { Job, NewTaskInput } from '../../../models/job';
import { TrackingLookupStore } from '../../../stores/tracking-lookup-store';
import { targetKey } from '../../../utils/job-rules';
import { toDateKey } from '../../../utils/geo-utils';
import { TaskBuilder } from '../task-builder/task-builder';

/**
 * Adds tasks to an open job. Places are limited to the branches the assignee may work in. Places the assignee
 * already has pending are locked; places pending with someone else can be added after a confirmation.
 */
@Component({
  selector: 'qfin-add-tasks-dialog',
  imports: [MatDialogModule, LucideDynamicIcon, TaskBuilder],
  template: `
    <div class="trk-dialog-header">
      <div class="flex items-center gap-4">
        <div class="trk-dialog-icon bg-emerald-50 text-emerald-600 dark:bg-secondary-600/50 dark:text-emerald-400">
          <svg lucideIcon="list-plus" class="w-6 h-6"></svg>
        </div>
        <div>
          <h2 class="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">Add tasks to {{ job.jobNo }}</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{{ job.title }} · {{ job.assigneeName }}</p>
        </div>
      </div>
      <button type="button" (click)="cancel()" class="trk-dialog-close" aria-label="Close"><svg lucideIcon="x" class="w-5 h-5"></svg></button>
    </div>
    <div class="p-5 w-[min(1000px,94vw)] max-h-[75vh] overflow-y-auto scroll-thin trk-form">
      <qfin-task-builder [(tasks)]="tasks" [allowedBranchIds]="allowedBranchIds()" [existingKeys]="existingKeys" [window]="window" [assigneeId]="job.assigneeId" />
    </div>
    <div class="trk-dialog-footer">
      <button type="button" (click)="cancel()" class="trk-btn-secondary"><svg lucideIcon="x" class="w-4 h-4"></svg> Cancel</button>
      @if (blockedTasks(); as n) {
        <span class="trk-field-error mr-auto">{{ n }} task(s) cannot be added. Remove them first.</span>
      }
      <button type="button" (click)="confirm()" class="trk-btn-primary" [disabled]="!tasks().length || blockedTasks() > 0">
        <svg lucideIcon="check" class="w-4 h-4"></svg> Add {{ tasks().length || '' }} task(s)
      </button>
    </div>
  `,
})
export class AddTasksDialog {
  readonly job = inject<{ job: Job }>(MAT_DIALOG_DATA).job;
  private readonly dialogRef = inject(MatDialogRef<AddTasksDialog, NewTaskInput[]>);
  private readonly lookup = inject(TrackingLookupStore);
  private readonly alerts = inject(AlertService);
  private readonly builder = viewChild(TaskBuilder);
  readonly blockedTasks = computed(() => this.builder()?.blockedTaskCount() ?? 0);

  readonly tasks = signal<NewTaskInput[]>([]);
  readonly existingKeys = this.job.tasks.filter((t) => t.status === 'Pending').map((t) => targetKey(t.type, t.target));
  readonly window: [string, string] = [this.job.startFrom ?? this.job.createdAt.slice(0, 10), this.job.completeBy < toDateKey() ? toDateKey() : this.job.completeBy];
  readonly allowedBranchIds = computed(() => this.lookup.officerById().get(this.job.assigneeId)?.branchIds ?? null);

  cancel() {
    this.dialogRef.close();
  }

  async confirm() {
    if (!this.tasks().length || this.blockedTasks()) return;
    const warned = this.builder()?.warnedTaskCount() ?? 0;
    if (warned) {
      const ok = await this.alerts.confirm(
        'Some places are already with other people',
        `${warned} of these ${this.tasks().length} tasks are already pending with someone else. ${this.job.assigneeName} will get their own task at those places. Add them anyway?`,
        'Add tasks',
        'Go back',
      );
      if (!ok.isConfirmed) return;
    }
    this.dialogRef.close(this.tasks());
  }
}
