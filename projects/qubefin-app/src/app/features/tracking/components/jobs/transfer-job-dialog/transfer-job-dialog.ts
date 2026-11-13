import { httpResource } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideDynamicIcon } from '@lucide/angular';
import { ApiPaths } from 'qubefin-core';
import { FieldOfficer } from '../../../models/field-officer';
import { Job, JobTask, JobTaskPoint, TransferJobRequest } from '../../../models/job';
import { TrackingLookupStore } from '../../../stores/tracking-lookup-store';
import { toDateKey } from '../../../utils/geo-utils';
import { PendingElsewhere, duplicateCheck, jobBranchConflict, targetKey } from '../../../utils/job-rules';
import { roleLabel, TASK_TYPE } from '../../../utils/tracking-labels';
import { TrkDateField } from '../../shared/date-field/trk-date-field';

export interface TransferJobDialogData {
  job: Job;
}

/**
 * Only the job's creator or someone above them gets here (`job.permissions.canTransfer`); the assignee never does.
 *
 * Whole job, nothing done yet → same job, new assignee.
 * Whole job with completed tasks → every pending task moves into a new job linked to this one, so the
 * completed tasks (and the route / allowance behind them) stay with the original assignee.
 * Selected tasks → those pending tasks move into a new linked job.
 * Tasks the new person already has pending (same type, same place, overlapping dates) do not move; they are listed here
 * before saving and stay in this job.
 */
@Component({
  selector: 'qfin-transfer-job-dialog',
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, LucideDynamicIcon, TrkDateField],
  templateUrl: './transfer-job-dialog.html',
})
export class TransferJobDialog {
  readonly data = inject<TransferJobDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<TransferJobDialog, TransferJobRequest>);
  private readonly lookup = inject(TrackingLookupStore);

  readonly roleLabel = roleLabel;
  readonly TASK_TYPE = TASK_TYPE;
  readonly today = toDateKey();
  readonly job = this.data.job;
  readonly pending = this.job.tasks.filter((t) => t.status === 'Pending');
  /** With completed tasks, even "whole job" creates a new linked job for the pending ones. */
  readonly hasDone = this.job.doneCount > 0;

  readonly mode = signal<'whole' | 'partial'>('whole');
  readonly picked = signal<ReadonlySet<string>>(new Set());
  readonly assigneeId = signal<string | null>(null);
  readonly completeBy = signal(this.job.endDate < this.today ? this.today : this.job.endDate);
  readonly remarks = signal('');
  readonly submitted = signal(false);

  /** A new job is created: selected tasks, or all pending tasks of a job with completed work. */
  readonly createsNewJob = computed(() => this.mode() === 'partial' || this.hasDone);

  readonly workBranchIds = computed(() =>
    this.mode() === 'whole'
      ? this.job.organisationUnitIds
      : [...new Set(this.pending.filter((t) => this.picked().has(t.id)).map((t) => t.target.organisationUnitId))],
  );

  /** Pending tasks the chosen person already holds elsewhere, to say which tasks will not move. */
  private readonly theirsResource = httpResource<JobTaskPoint[]>(() => {
    const id = this.assigneeId();
    return id ? { url: `${ApiPaths.TRACKING}/jobs/task-points`, params: { assigneeId: id, pendingOnly: 'true' } } : undefined;
  });
  readonly staying = computed<{ task: JobTask; reason: string }[]>(() => {
    const id = this.assigneeId();
    const theirs = (this.theirsResource.value() ?? []).filter((p) => p.jobId !== this.job.id && p.originRefId);
    if (!id || !theirs.length) return [];
    const window: [string, string] = [this.today, this.createsNewJob() ? this.completeBy() : this.job.endDate];
    const moving = this.mode() === 'whole' ? this.pending : this.pending.filter((t) => this.picked().has(t.id));
    return moving.flatMap((task) => {
      const key = targetKey(task.taskType, task.target);
      const same: PendingElsewhere[] = theirs
        .filter((p) => `${p.taskType}|${p.targetKind}:${p.originRefId}` === key)
        .map((p) => ({ jobNo: p.jobCode, assigneeId: p.assigneeId, assigneeName: p.assigneeName, window: [p.jobStartDate, p.jobEndDate < this.today ? this.today : p.jobEndDate] }));
      const { block } = duplicateCheck(id, task.taskType, window, same);
      return block ? [{ task, reason: block }] : [];
    });
  });

  readonly groups = computed(() =>
    this.lookup.assignableByRole().map((g) => ({
      ...g,
      officers: g.officers.map((o) => ({ ...o, blockedReason: this.blocked(o) })),
    })),
  );

  readonly valid = computed(
    () =>
      !!this.assigneeId() &&
      !this.blocked(this.lookup.officerById().get(this.assigneeId()!)!) &&
      this.remarks().trim().length >= 3 &&
      (this.mode() === 'whole' || this.picked().size > 0) &&
      (!this.createsNewJob() || (!!this.completeBy() && this.completeBy() >= this.today)),
  );

  private blocked(o: FieldOfficer | undefined): string | null {
    if (!o) return 'Not found';
    if (o.id === this.job.assigneeId) return 'Holds this job now';
    return jobBranchConflict(o, this.workBranchIds(), (id) => this.lookup.branchById().get(id)?.name ?? 'another branch');
  }

  setMode(mode: 'whole' | 'partial') {
    this.mode.set(mode);
    this.assigneeId.set(null);
  }

  toggle(id: string, on: boolean) {
    const next = new Set(this.picked());
    if (on) next.add(id);
    else next.delete(id);
    this.picked.set(next);
    if (this.assigneeId() && this.blocked(this.lookup.officerById().get(this.assigneeId()!))) this.assigneeId.set(null);
  }

  toggleAll(on: boolean) {
    this.picked.set(on ? new Set(this.pending.map((t) => t.id)) : new Set());
  }

  cancel() {
    this.dialogRef.close();
  }

  confirm() {
    this.submitted.set(true);
    if (!this.valid()) return;
    const partial = this.mode() === 'partial';
    this.dialogRef.close({
      assigneeId: this.assigneeId()!,
      taskIds: partial ? [...this.picked()] : null,
      remarks: this.remarks().trim(),
      endDate: this.createsNewJob() ? this.completeBy() : null,
    });
  }
}
