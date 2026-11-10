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
import { DEFAULT_TASK_PRIORITY, Job, JobSummary, TASK_PRIORITIES } from '../../../models/job';
import { AddOdToJobRequest, OdMember, OdTaskInput } from '../../../models/od-member';
import { TrackingLookupStore } from '../../../stores/tracking-lookup-store';
import { toDateKey } from '../../../utils/geo-utils';
import { jobBranchConflict } from '../../../utils/job-rules';
import { JOB_STATUS, JOB_TASK_STATUS, ROLE_LABEL, TASK_PRIORITY, TASK_TYPE } from '../../../utils/tracking-labels';
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
 * Pick an open job (its details and tasks are shown before adding) or describe a new one (assignee required).
 * A member already pending with the job's assignee is skipped; pending with someone else is added with a warning.
 * Priority, instruction and accompanied by are set per member (task level only; no job-level defaults).
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
  readonly TASK_PRIORITY = TASK_PRIORITY;
  readonly TASK_PRIORITIES = TASK_PRIORITIES;
  readonly today = toDateKey();

  readonly members = this.data.members;
  readonly amount = this.members.reduce((s, c) => s + c.overdueAmount, 0);
  readonly branchIds = [...new Set(this.members.map((c) => c.branchId))];
  readonly branchNames = [...new Set(this.members.map((c) => c.branchName))];

  readonly mode = signal<'existing' | 'new'>('existing');
  readonly submitted = signal(false);

  /** Task-level details per member: priority (default Medium), instruction and companion. */
  readonly details = signal<ReadonlyMap<string, OdTaskInput>>(
    new Map(this.data.members.map((c) => [c.id, { memberId: c.id, priority: DEFAULT_TASK_PRIORITY, notes: null, accompaniedById: null }])),
  );

  setDetail(memberId: string, patch: Partial<Omit<OdTaskInput, 'memberId'>>) {
    const next = new Map(this.details());
    next.set(memberId, { ...next.get(memberId)!, ...patch });
    this.details.set(next);
  }

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
      (j) => !text || [j.jobCode, j.jobTitle, j.assigneeName].some((v) => v.toLowerCase().includes(text)),
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
    this.lookup.assignableByRole().map((g) => ({
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

  /** Per branch: who may go along (people working there, or the signed-in user); never the holder. */
  readonly companionsByBranch = computed(() => {
    const me = this.lookup.viewer();
    const holder = this.holder()?.id;
    const map = new Map<string, { id: string; label: string }[]>();
    this.branchIds.forEach((b) => {
      const list = me?.employeeId && me.employeeId !== holder ? [{ id: me.employeeId, label: `${me.name} (me)` }] : [];
      this.lookup
        .officers()
        .filter((o) => o.id !== holder && o.organisationUnitIds.includes(b))
        .forEach((o) => list.push({ id: o.id, label: `${o.name} · ${ROLE_LABEL[o.role]}` }));
      map.set(b, list);
    });
    return map;
  });

  /** Per member: already pending with someone other than the holder (added anyway, with a warning). */
  readonly warnings = computed(() => {
    const map = new Map<string, string>();
    const holder = this.holder()?.id;
    this.members.forEach((c) => {
      const others = c.pendingWith.filter((p) => p.assigneeId !== holder);
      if (others.length && !this.skipReasons().has(c.id)) map.set(c.id, `also pending with ${others.map((p) => `${p.assigneeName} (${p.jobNo})`).join(', ')}`);
    });
    return map;
  });

  /** Per-member reason it will be skipped, if any. */
  readonly skipReasons = computed(() => {
    const map = new Map<string, string>();
    const j = this.mode() === 'existing' ? this.job() : undefined;
    const holder = this.holder();
    this.members.forEach((c) => {
      if (!c.homeLocation) return map.set(c.id, 'home not geo-tagged');
      if (j?.tasks.some((t) => t.taskType === 'OdFollowUp' && t.target.originRefId === c.id && t.status === 'Pending')) return map.set(c.id, 'already in this job');
      const mine = holder ? c.pendingWith.find((p) => p.assigneeId === holder.id) : undefined;
      if (mine) return map.set(c.id, `already pending with ${mine.assigneeName} in ${mine.jobNo}`);
      const conflict = holder ? jobBranchConflict(holder, [...new Set([...(j?.organisationUnitIds ?? []), c.branchId])]) : null;
      if (conflict) return map.set(c.id, `${c.branchName} is outside ${holder!.name}'s ${holder!.unitName}`);
      return undefined;
    });
    return map;
  });
  readonly addable = computed(() => this.members.length - this.skipReasons().size);

  readonly valid = computed(() => {
    if (this.addable() === 0) return false;
    if (this.mode() === 'existing') return !!this.job();
    return !!this.title().trim() && !!this.assigneeId() && !!this.completeBy() && this.completeBy() >= this.today;
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
    const details = this.details();
    const allowed = this.companionsByBranch();
    const members = this.members
      .filter((c) => !this.skipReasons().has(c.id))
      .map((c) => {
        const d = details.get(c.id)!;
        const companionOk = !!d.accompaniedById && (allowed.get(c.branchId) ?? []).some((x) => x.id === d.accompaniedById);
        return { ...d, notes: d.notes?.trim() || null, accompaniedById: companionOk ? d.accompaniedById : null };
      });
    this.dialogRef.close({
      members,
      jobId: this.mode() === 'existing' ? this.selectedJobId() : null,
      newJob:
        this.mode() === 'new'
          ? {
              title: this.title().trim(),
              description: this.description().trim() || null,
              assigneeId: this.assigneeId(),
              startFrom: this.startFrom() || null,
              completeBy: this.completeBy(),
            }
          : null,
    });
  }
}
