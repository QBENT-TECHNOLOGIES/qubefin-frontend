import { DatePipe, DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { ApiPaths } from 'qubefin-core';
import { FieldOfficer } from '../../../models/field-officer';
import { Job, JobSummary } from '../../../models/job';
import { AddOdToJobRequest, OdMember } from '../../../models/od-member';
import { TrackingLookupStore } from '../../../stores/tracking-lookup-store';
import { toDateKey } from '../../../utils/geo-utils';
import { jobBranchConflict } from '../../../utils/job-rules';
import { JOB_STATUS, JOB_TASK_STATUS, ROLE_LABEL, TASK_TYPE } from '../../../utils/tracking-labels';
import { TrackingChip } from '../../shared/tracking-chip/tracking-chip';
import { TrkDateField } from '../../shared/date-field/trk-date-field';

export interface AddToJobDialogData {
  members: OdMember[];
}

const plusDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toDateKey(d);
};

/**
 * OD members are not assigned on their own any more: they become OD follow-up tasks inside a job.
 * Pick an open job (its details and tasks are shown before adding) or describe a new one.
 */
@Component({
  selector: 'qfin-add-to-job-dialog',
  imports: [DatePipe, DecimalPipe, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatTooltipModule, LucideDynamicIcon, TrackingChip, TrkDateField],
  templateUrl: './add-to-job-dialog.html',
})
export class AddToJobDialog {
  readonly data = inject<AddToJobDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<AddToJobDialog, AddOdToJobRequest>);
  readonly lookup = inject(TrackingLookupStore);

  readonly JOB_STATUS = JOB_STATUS;
  readonly JOB_TASK_STATUS = JOB_TASK_STATUS;
  readonly TASK_TYPE = TASK_TYPE;
  readonly ROLE_LABEL = ROLE_LABEL;
  readonly today = toDateKey();

  readonly members = this.data.members;
  readonly amount = this.members.reduce((s, c) => s + c.overdueAmount, 0);
  readonly branchIds = [...new Set(this.members.map((c) => c.branchId))];
  readonly branchNames = [...new Set(this.members.map((c) => c.branchName))];

  readonly mode = signal<'existing' | 'new'>('existing');
  readonly notes = signal('');
  readonly submitted = signal(false);

  // --- Existing job ----------------------------------------------------------------------------
  readonly filterAssigneeId = signal<string | null>(null);
  readonly jobSearch = signal('');
  readonly selectedJobId = signal<string | null>(null);

  private readonly openResource = httpResource<JobSummary[]>(() => {
    const params: Record<string, string> = {};
    // With one branch, list only jobs that may take that branch's members.
    if (this.branchIds.length === 1) params['branchId'] = this.branchIds[0];
    if (this.filterAssigneeId()) params['assigneeId'] = this.filterAssigneeId()!;
    return { url: `${ApiPaths.TRACKING}/jobs/open`, params };
  });
  readonly openJobs = computed(() => {
    const text = this.jobSearch().trim().toLowerCase();
    return (this.openResource.value() ?? []).filter(
      (j) => !text || [j.jobNo, j.title, j.assigneeName ?? ''].some((v) => v.toLowerCase().includes(text)),
    );
  });
  readonly openLoading = computed(() => this.openResource.isLoading());

  private readonly jobResource = httpResource<Job>(() => {
    const id = this.selectedJobId();
    return id ? `${ApiPaths.TRACKING}/jobs/${id}` : undefined;
  });
  readonly job = computed(() => (this.selectedJobId() ? this.jobResource.value() : undefined));
  readonly jobLoading = computed(() => this.jobResource.isLoading());

  // --- New job ---------------------------------------------------------------------------------
  readonly title = signal('OD follow-up');
  readonly assigneeId = signal<string>('');
  readonly completeBy = signal(plusDays(3));
  readonly startFrom = signal(toDateKey());
  readonly description = signal('Visit each OD member at home. Collect, or record the promise-to-pay date.');

  readonly officerGroups = computed(() =>
    this.lookup.officersByRole().map((g) => ({
      ...g,
      officers: g.officers.map((o) => {
        const fit = this.members.filter((c) => !jobBranchConflict(o, [c.branchId])).length;
        const note = fit === 0 ? `None of these members are in ${o.unitName}` : fit < this.members.length ? `Only ${fit} of ${this.members.length} are in ${o.unitName}` : null;
        return { ...o, fit, note };
      }),
    })),
  );

  /** Who will hold the tasks, for the branch check. */
  readonly holder = computed<FieldOfficer | null>(() => {
    if (this.mode() === 'new') return this.lookup.officerById().get(this.assigneeId()) ?? null;
    const j = this.job();
    return j?.assigneeId ? (this.lookup.officerById().get(j.assigneeId) ?? null) : null;
  });

  /** Per-member reason it will be skipped, if any. */
  readonly skipReasons = computed(() => {
    const map = new Map<string, string>();
    const j = this.mode() === 'existing' ? this.job() : undefined;
    const holder = this.holder();
    this.members.forEach((c) => {
      if (!c.homeLocation) return map.set(c.id, 'home not geo-tagged');
      if (c.followUp?.status === 'Pending') return map.set(c.id, `already pending in ${c.followUp.jobNo}`);
      if (j?.tasks.some((t) => t.type === 'OdFollowUp' && t.target.refId === c.id && t.status === 'Pending')) return map.set(c.id, 'already in this job');
      const conflict = holder ? jobBranchConflict(holder, [...new Set([...(j?.branchIds ?? []), c.branchId])]) : null;
      if (conflict) return map.set(c.id, `${c.branchName} is outside ${holder!.name}'s ${holder!.unitName}`);
      return undefined;
    });
    return map;
  });
  readonly addable = computed(() => this.members.length - this.skipReasons().size);

  readonly valid = computed(() => {
    if (this.addable() === 0) return false;
    if (this.mode() === 'existing') return !!this.job();
    return !!this.title().trim() && !!this.completeBy() && this.completeBy() >= this.today;
  });

  pct(j: JobSummary) {
    return j.taskCount ? Math.round((j.doneCount / j.taskCount) * 100) : 0;
  }

  setMode(m: 'existing' | 'new') {
    this.mode.set(m);
    this.submitted.set(false);
  }

  cancel() {
    this.dialogRef.close();
  }

  confirm() {
    this.submitted.set(true);
    if (!this.valid()) return;
    const ids = this.members.filter((c) => !this.skipReasons().has(c.id)).map((c) => c.id);
    this.dialogRef.close({
      memberIds: ids,
      jobId: this.mode() === 'existing' ? this.selectedJobId() : null,
      newJob:
        this.mode() === 'new'
          ? {
              title: this.title().trim(),
              description: this.description().trim() || null,
              assigneeId: this.assigneeId() || null,
              startFrom: this.startFrom() || null,
              completeBy: this.completeBy(),
            }
          : null,
      notes: this.notes().trim() || null,
    });
  }
}
