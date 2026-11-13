import { unitIdsOf } from '../../../models/field-officer';
import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, model, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { ApiPaths } from 'qubefin-core';
import { GeoTagPoint, GeoTagPointsResponse } from '../../../models/geo-tag';
import { DEFAULT_TASK_PRIORITY, JobTaskPoint, NewTaskInput, TASK_PRIORITIES, TaskTarget, TaskTargetKind, TaskType } from '../../../models/job';
import { TrackingLookupStore } from '../../../stores/tracking-lookup-store';
import { formatCoords, toDateKey } from '../../../utils/geo-utils';
import { LOCATION_NOT_VERIFIED, PICKER_KINDS, PendingElsewhere, TYPES_FOR_KIND, defaultTypeFor, duplicateCheck, needsVerifiedLocation, targetKey } from '../../../utils/job-rules';
import { roleLabel, TASK_PRIORITY, TASK_TYPE } from '../../../utils/tracking-labels';
import { FieldPointDraft, FieldPointMarker, FieldPointType, PlaceMultiSelect } from '../place-multi-select/place-multi-select';

/** Why a task (or a place) cannot be added, or a note that it is also pending with someone else. */
export interface TaskCheck {
  block: string | null;
  warn: string | null;
}

/** Someone who can go along on a task: an employee working in the task's branch, or the signed-in user. */
export interface Companion {
  id: string;
  label: string;
}

const NO_ISSUE: TaskCheck = { block: null, warn: null };

/**
 * Builds the list of tasks for a job. The assignee is known first (it is required). Pick a branch, then select places (list or map):
 * the task type follows from the place — group → Group Visit, member → Member Visit, OD member → OD Follow-up.
 * Clicking empty ground on the map adds a lead-sourcing or survey point. After adding, a task's type can be switched where the place allows it (OD member → Member Visit,
 * group → Survey). Priority (default Medium), instruction and accompanied by are set on each task in the list (task level only).
 * Tasks have no time and no order.
 *
 * Duplicate rule (since Nov 2026): a place whose same task is pending with the SAME person in an overlapping job is
 * locked; pending with someone else is allowed, with a warning (`utils/job-rules.ts` → `duplicateCheck`).
 */
@Component({
  selector: 'qfin-task-builder',
  imports: [MatFormFieldModule, MatInputModule, MatSelectModule, MatTooltipModule, LucideDynamicIcon, PlaceMultiSelect],
  templateUrl: './task-builder.html',
})
export class TaskBuilder {
  readonly lookup = inject(TrackingLookupStore);

  /** The tasks added so far (two-way). */
  readonly tasks = model<NewTaskInput[]>([]);
  /** Branches places may come from; null = every branch in the user's scope. */
  readonly allowedBranchIds = input<string[] | null>(null);
  /** Pending tasks already in the job, to warn about duplicates. */
  readonly existingKeys = input<string[]>([]);
  /** Days the job is active ([start, end], yyyy-MM-dd); places with the same task pending in an overlapping job are blocked. */
  readonly window = input<[string, string] | null>(null);
  /** Who will hold the job (if known): their pending tasks and home are shown on the picker map. */
  readonly assigneeId = input<string | null>(null);

  readonly TASK_TYPE = TASK_TYPE;
  readonly TASK_PRIORITY = TASK_PRIORITY;
  readonly TASK_PRIORITIES = TASK_PRIORITIES;
  readonly TYPES_FOR_KIND = TYPES_FOR_KIND;
  readonly formatCoords = formatCoords;

  readonly branchId = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  /** Geo-tag ids ticked in the picker. */
  readonly selectedIds = signal<string[]>([]);

  readonly branches = computed(() => {
    const allowed = this.allowedBranchIds();
    return this.lookup.branches().filter((b) => !allowed || allowed.includes(b.id));
  });
  readonly branch = computed(() => this.lookup.branchById().get(this.branchId() ?? '') ?? null);

  /** Every geo-tagged group, member and OD member of the chosen branch (light payload). */
  private readonly pointsResource = httpResource<GeoTagPointsResponse>(() => {
    const id = this.branchId();
    if (!id) return undefined;
    return { url: `${ApiPaths.TRACKING}/geo-tags/points`, params: { organisationUnitId: id, kinds: PICKER_KINDS.join(',') } };
  });
  readonly branchPlaces = computed(() => this.pointsResource.value()?.points ?? []);
  readonly untaggedByKind = computed(() => this.pointsResource.value()?.untaggedByKind ?? {});
  readonly pointsLoading = computed(() => this.pointsResource.isLoading());

  /** Context for the map: the assignee's pending tasks in open jobs, and their home. */
  readonly assignee = computed(() => this.lookup.officerById().get(this.assigneeId() ?? '') ?? null);
  private readonly assigneeTasksResource = httpResource<JobTaskPoint[]>(() => {
    const id = this.assigneeId();
    if (!id || !this.branchId()) return undefined;
    return { url: `${ApiPaths.TRACKING}/jobs/task-points`, params: { assigneeId: id, pendingOnly: 'true' } };
  });
  readonly assigneeTasks = computed(() => this.assigneeTasksResource.value() ?? []);

  /** Pending tasks of all open jobs the user can see: same person → locked, someone else → warning. */
  private readonly pendingResource = httpResource<JobTaskPoint[]>(() => `${ApiPaths.TRACKING}/jobs/task-points`);
  private readonly pendingByKey = computed(() => {
    const map = new Map<string, PendingElsewhere[]>();
    (this.pendingResource.value() ?? []).forEach((p) => {
      if (!p.originRefId) return;
      const key = `${p.taskType}|${p.targetKind}:${p.originRefId}`;
      const entry: PendingElsewhere = { jobNo: p.jobCode, assigneeId: p.assigneeId, assigneeName: p.assigneeName, window: [p.jobStartDate, this.activeEnd(p.jobEndDate)] };
      map.set(key, [...(map.get(key) ?? []), entry]);
    });
    return map;
  });

  /** Per branch: who may go along (people working in that branch, and the signed-in user), never the assignee. */
  readonly companionsByBranch = computed(() => {
    const me = this.lookup.viewer();
    const assignee = this.assigneeId();
    const map = new Map<string, Companion[]>();
    this.lookup.branches().forEach((b) => {
      const list: Companion[] = me?.employeeId && me.employeeId !== assignee ? [{ id: me.employeeId, label: `${me.name} (me)` }] : [];
      this.lookup
        .officers()
        .filter((o) => o.id !== assignee && unitIdsOf(o).includes(b.id))
        .forEach((o) => list.push({ id: o.id, label: `${o.name} · ${roleLabel(o.role)}` }));
      map.set(b.id, list);
    });
    return map;
  });
  readonly companionName = computed(() => {
    const map = new Map<string, string>();
    this.companionsByBranch().forEach((list) => list.forEach((c) => map.set(c.id, c.label)));
    return map;
  });

  private readonly keysInList = computed(() => new Set(this.tasks().map((t) => targetKey(t.taskType, t.target))));
  private readonly keysInJob = computed(() => new Set(this.existingKeys()));

  /**
   * Place id → why it cannot take its task now (with the type it would get). Groups, members and OD members
   * whose location is not verified cannot be put in a job until it is (verified from the mobile app).
   */
  private readonly placeChecks = computed(() => {
    const blocked = new Map<string, string>();
    const warned = new Map<string, string>();
    this.branchPlaces().forEach((p) => {
      if (this.isUnverified(p)) return void blocked.set(p.id, LOCATION_NOT_VERIFIED);
      const c = this.check(defaultTypeFor(p.kind as TaskTargetKind), this.targetOf(p));
      if (c.block) blocked.set(p.id, c.block);
      else if (c.warn) warned.set(p.id, c.warn);
    });
    return { blocked, warned };
  });
  readonly blocked = computed(() => this.placeChecks().blocked);
  /** Place id → "also pending with …": selectable, shown with a warning. */
  readonly warned = computed(() => this.placeChecks().warned);

  /** Per task in the list: blocked (e.g. the assignee was changed to someone who already has it) or warned. */
  readonly taskChecks = computed(() => this.tasks().map((t, i) => this.check(t.taskType, t.target, i)));
  readonly blockedTaskCount = computed(() => this.taskChecks().filter((c) => c.block).length);
  readonly warnedTaskCount = computed(() => this.taskChecks().filter((c) => c.warn).length);

  /** Lead sourcing / survey points in the list, for the map. */
  readonly fieldPoints = computed<FieldPointMarker[]>(() =>
    this.tasks()
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => t.target.kind === 'Custom' && (t.taskType === 'LeadSourcing' || t.taskType === 'Survey'))
      .map(({ t, i }) => ({ key: `${i}`, type: t.taskType as FieldPointType, name: t.target.targetName, location: t.target.targetLocation, radiusMeters: t.target.radiusMeters })),
  );

  constructor() {
    // Keep the branch choice valid when the allowed branches change (e.g. assignee picked).
    effect(() => {
      const list = this.branches();
      const current = this.branchId();
      if (list.length === 1) this.branchId.set(list[0].id);
      else if (current && !list.some((b) => b.id === current)) this.branchId.set(null);
    });
    // Drop ticked places that are no longer on offer (branch changed, or they became unavailable).
    effect(() => {
      const ids = this.selectedIds();
      if (!ids.length) return;
      const ok = new Set(this.branchPlaces().map((p) => p.id));
      const blocked = this.blocked();
      const keep = ids.filter((id) => ok.has(id) && !blocked.has(id));
      if (keep.length !== ids.length) this.selectedIds.set(keep);
    });
    // The assignee cannot also be the person going along.
    effect(() => {
      const assignee = this.assigneeId();
      if (!assignee) return;
      if (this.tasks().some((t) => t.coOrdinatedBy === assignee)) {
        this.tasks.update((list) => list.map((t) => (t.coOrdinatedBy === assignee ? { ...t, accompaniedById: null } : t)));
      }
    });
  }

  onBranchChange(id: string | null) {
    this.branchId.set(id);
    this.selectedIds.set([]);
    this.error.set(null);
  }

  private isUnverified(p: GeoTagPoint) {
    return needsVerifiedLocation(p.kind) && !p.verified;
  }

  private targetOf(tag: GeoTagPoint): TaskTarget {
    return {
      kind: tag.kind as TaskTargetKind,
      originRefId: tag.refId,
      targetName: tag.name,
      
      targetLocation: tag.location,
      organisationUnitId: tag.organisationUnitId,
      branchName: tag.branchName,
      radiusMeters: Math.min(tag.taskLocationMatchInMeters, 500),
    };
  }

  private titleFor(type: TaskType, target: TaskTarget) {
    return `${TASK_TYPE[type].label} – ${target.targetName.replace(/ \([A-Z]{3}-C\d+\)$/, '')}`;
  }

  /**
   * Can `type` be added at `target` for this assignee? `block` = no (already in this list / job, or the same person
   * has it pending in an overlapping job); `warn` = yes, but someone else also has it pending.
   * `skipIndex` = a task in the list to ignore (the task being checked, or whose type is being switched).
   */
  check(type: TaskType, target: TaskTarget, skipIndex = -1): TaskCheck {
    const key = targetKey(type, target);
    if (this.tasks().some((t, i) => i !== skipIndex && targetKey(t.taskType, t.target) === key)) return { block: 'already in this list', warn: null };
    if (this.keysInJob().has(key)) return { block: 'already pending in this job', warn: null };
    if (!target.originRefId) return NO_ISSUE;
    return duplicateCheck(this.assigneeId(), type, this.window(), this.pendingByKey().get(key) ?? []);
  }

  /** A delayed job is still active today. */
  private activeEnd(completeBy: string) {
    const today = toDateKey();
    return completeBy < today ? today : completeBy;
  }

  /** One task per ticked place, typed by the place, all with the same instructions. */
  addSelected() {
    if (!this.branchId()) {
      this.error.set('Select a branch first.');
      return;
    }
    const chosen = new Set(this.selectedIds());
    const fresh: NewTaskInput[] = [];
    this.branchPlaces()
      .filter((p) => chosen.has(p.id) && !this.isUnverified(p))
      .forEach((p) => {
        const target = this.targetOf(p);
        const type = defaultTypeFor(target.kind);
        if (!this.check(type, target).block) fresh.push(this.newTask(type, target, null));
      });
    if (!fresh.length) {
      this.error.set('Select at least one group or member, in the list or on the map.');
      return;
    }
    this.tasks.update((list) => [...list, ...fresh]);
    this.selectedIds.set([]);
    this.error.set(null);
  }

  /** New tasks start at Medium priority with no companion; priority, instruction and companion are set per task in the list. */
  private newTask(type: TaskType, target: TaskTarget, notes: string | null): NewTaskInput {
    return { taskType: type, taskTitle: this.titleFor(type, target), notes, priority: DEFAULT_TASK_PRIORITY, coOrdinatedBy: null, target };
  }

  /** Lead sourcing / survey at a point picked on the map. */
  addFieldPoint(d: FieldPointDraft) {
    const b = this.branch();
    if (!b) return;
    const target: TaskTarget = {
      kind: 'Custom',
      originRefId: null,
      targetName: d.name,
      
      targetLocation: d.location,
      organisationUnitId: b.id,
      branchName: b.name,
      radiusMeters: d.radiusMeters,
    };
    const why = this.check(d.type, target).block;
    if (why) {
      this.error.set(`A ${TASK_TYPE[d.type].label.toLowerCase()} at this point is ${why}.`);
      return;
    }
    this.error.set(null);
    this.tasks.update((list) => [...list, this.newTask(d.type, target, d.notes?.trim() || null)]);
  }

  /** Switch an added task to another type its place allows (e.g. OD member → Member Visit). */
  changeType(index: number, type: TaskType) {
    const task = this.tasks()[index];
    if (!task || task.taskType === type) return;
    const why = this.check(type, task.target, index).block;
    if (why) {
      this.error.set(`${task.target.targetName} cannot take a ${TASK_TYPE[type].label.toLowerCase()}: ${why}.`);
      this.tasks.update((list) => [...list]); // re-render the select back to the old value
      return;
    }
    this.error.set(null);
    const oldPrefix = `${TASK_TYPE[task.taskType].label} – `;
    const title = task.taskTitle.startsWith(oldPrefix) ? `${TASK_TYPE[type].label} – ${task.taskTitle.slice(oldPrefix.length)}` : task.taskTitle;
    this.tasks.update((list) => list.map((t, i) => (i === index ? { ...t, type, title } : t)));
  }

  remove(index: number) {
    this.tasks.update((list) => list.filter((_, i) => i !== index));
  }

  /** Clears every task from the list (handy after a large bulk add). */
  removeAll() {
    this.tasks.set([]);
  }

  rename(index: number, title: string) {
    this.update(index, { taskTitle: title });
  }

  /** Change one task's priority, instruction or companion. */
  update(index: number, patch: Partial<Pick<NewTaskInput, 'taskTitle' | 'priority' | 'notes' | 'coOrdinatedBy'>>) {
    this.tasks.update((list) => list.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }
}
