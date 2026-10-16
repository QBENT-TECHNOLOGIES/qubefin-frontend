import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideDynamicIcon } from '@lucide/angular';
import { FieldOfficer } from '../../../models/field-officer';
import { Job, TransferJobRequest } from '../../../models/job';
import { TrackingLookupStore } from '../../../stores/tracking-lookup-store';
import { toDateKey } from '../../../utils/geo-utils';
import { jobBranchConflict } from '../../../utils/job-rules';
import { ROLE_LABEL, TASK_TYPE } from '../../../utils/tracking-labels';

export interface TransferJobDialogData {
  job: Job;
}

/**
 * Whole job → same job, new assignee (completed tasks stay credited to whoever did them).
 * Selected tasks → those pending tasks move into a new job linked to this one.
 */
@Component({
  selector: 'qfin-transfer-job-dialog',
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, LucideDynamicIcon],
  templateUrl: './transfer-job-dialog.html',
})
export class TransferJobDialog {
  readonly data = inject<TransferJobDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<TransferJobDialog, TransferJobRequest>);
  private readonly lookup = inject(TrackingLookupStore);

  readonly ROLE_LABEL = ROLE_LABEL;
  readonly TASK_TYPE = TASK_TYPE;
  readonly today = toDateKey();
  readonly job = this.data.job;
  readonly pending = this.job.tasks.filter((t) => t.status === 'Pending');

  readonly mode = signal<'whole' | 'partial'>('whole');
  readonly picked = signal<ReadonlySet<string>>(new Set());
  readonly assigneeId = signal<string | null>(null);
  readonly completeBy = signal(this.job.completeBy < this.today ? this.today : this.job.completeBy);
  readonly remarks = signal('');
  readonly submitted = signal(false);

  readonly workBranchIds = computed(() =>
    this.mode() === 'whole'
      ? this.job.branchIds
      : [...new Set(this.pending.filter((t) => this.picked().has(t.id)).map((t) => t.target.branchId))],
  );

  readonly groups = computed(() =>
    this.lookup.officersByRole().map((g) => ({
      ...g,
      officers: g.officers.map((o) => ({ ...o, blockedReason: this.blocked(o) })),
    })),
  );

  readonly valid = computed(
    () =>
      !!this.assigneeId() &&
      !this.blocked(this.lookup.officerById().get(this.assigneeId()!)!) &&
      this.remarks().trim().length >= 3 &&
      (this.mode() === 'whole' || (this.picked().size > 0 && !!this.completeBy() && this.completeBy() >= this.today)),
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
      completeBy: partial ? this.completeBy() : null,
    });
  }
}
