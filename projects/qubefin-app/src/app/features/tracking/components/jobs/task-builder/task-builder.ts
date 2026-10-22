import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, model, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { ApiPaths } from 'qubefin-core';
import { GeoTagPoint, GeoTagPointsResponse } from '../../../models/geo-tag';
import { JobTaskPoint, NewTaskInput, TaskTarget, TaskTargetKind, TaskType } from '../../../models/job';
import { TrackingLookupStore } from '../../../stores/tracking-lookup-store';
import { formatCoords, toDateKey } from '../../../utils/geo-utils';
import { PICKER_KINDS, TYPES_FOR_KIND, defaultTypeFor, targetKey } from '../../../utils/job-rules';
import { TASK_TYPE } from '../../../utils/tracking-labels';
import { FieldPointDraft, FieldPointMarker, FieldPointType, PlaceMultiSelect } from '../place-multi-select/place-multi-select';

/**
 * Builds the list of tasks for a job. Pick a branch, then select places (list or map):
 * the task type follows from the place — group → Group Visit, member → Member Visit, OD member → OD Follow-up.
 * Clicking empty ground on the map adds a lead-sourcing or survey point. One set of instructions is copied to every
 * selected place. After adding, a task's type can be switched where the place allows it (OD member → Member Visit,
 * group → Survey). Tasks have no time and no order.
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
  readonly TYPES_FOR_KIND = TYPES_FOR_KIND;
  readonly formatCoords = formatCoords;

  readonly branchId = signal<string | null>(null);
  readonly notes = signal('');
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
    return { url: `${ApiPaths.TRACKING}/geo-tags/points`, params: { branchId: id, kinds: PICKER_KINDS.join(',') } };
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

  /** Pending tasks of all open jobs, to flag places that are already taken. */
  private readonly pendingResource = httpResource<JobTaskPoint[]>(() => `${ApiPaths.TRACKING}/jobs/task-points`);
  private readonly pendingByKey = computed(() => {
    const map = new Map<string, JobTaskPoint[]>();
    (this.pendingResource.value() ?? []).forEach((p) => {
      if (!p.refId) return;
      const key = `${p.type}|${p.targetKind}:${p.refId}`;
      map.set(key, [...(map.get(key) ?? []), p]);
    });
    return map;
  });

  private readonly keysInList = computed(() => new Set(this.tasks().map((t) => targetKey(t.type, t.target))));
  private readonly keysInJob = computed(() => new Set(this.existingKeys()));

  /** Place id → why it cannot take its task now (with the type it would get). */
  readonly blocked = computed(() => {
    const map = new Map<string, string>();
    this.branchPlaces().forEach((p) => {
      const why = this.conflict(defaultTypeFor(p.kind as TaskTargetKind), this.targetOf(p));
      if (why) map.set(p.id, why);
    });
    return map;
  });

  /** Lead sourcing / survey points in the list, for the map. */
  readonly fieldPoints = computed<FieldPointMarker[]>(() =>
    this.tasks()
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => t.target.kind === 'Custom' && (t.type === 'LeadSourcing' || t.type === 'Survey'))
      .map(({ t, i }) => ({ key: `${i}`, type: t.type as FieldPointType, name: t.target.name, location: t.target.location, radiusMeters: t.target.matchRadiusMeters })),
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
  }

  onBranchChange(id: string | null) {
    this.branchId.set(id);
    this.selectedIds.set([]);
    this.error.set(null);
  }

  private targetOf(tag: GeoTagPoint): TaskTarget {
    return {
      kind: tag.kind as TaskTargetKind,
      refId: tag.refId,
      name: tag.name,
      address: tag.address ?? tag.branchName,
      location: tag.location,
      branchId: tag.branchId,
      branchName: tag.branchName,
      matchRadiusMeters: Math.min(tag.radiusMeters, 500),
    };
  }

  private titleFor(type: TaskType, target: TaskTarget) {
    return `${TASK_TYPE[type].label} – ${target.name.replace(/ \([A-Z]{3}-C\d+\)$/, '')}`;
  }

  /**
   * Why `type` cannot be added at `target` now, or null. `skipIndex` = a task in the list to ignore
   * (when switching that task's own type).
   */
  conflict(type: TaskType, target: TaskTarget, skipIndex = -1): string | null {
    const key = targetKey(type, target);
    if (this.tasks().some((t, i) => i !== skipIndex && targetKey(t.type, t.target) === key)) return 'already in this list';
    if (this.keysInJob().has(key)) return 'already pending in this job';
    if (!target.refId) return null;
    const w = this.window();
    const hit = (this.pendingByKey().get(key) ?? []).find((p) => !w || (p.jobStartFrom <= w[1] && w[0] <= this.activeEnd(p.jobCompleteBy)));
    return hit ? `pending in ${hit.jobNo}${hit.assigneeName ? ' (' + hit.assigneeName + ')' : ''}` : null;
  }

  /** An overdue job is still active today. */
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
    const notes = this.notes().trim() || null;
    const fresh: NewTaskInput[] = [];
    this.branchPlaces()
      .filter((p) => chosen.has(p.id))
      .forEach((p) => {
        const target = this.targetOf(p);
        const type = defaultTypeFor(target.kind);
        if (!this.conflict(type, target)) fresh.push({ type, title: this.titleFor(type, target), notes, target });
      });
    if (!fresh.length) {
      this.error.set('Select at least one group or member, in the list or on the map.');
      return;
    }
    this.tasks.update((list) => [...list, ...fresh]);
    this.selectedIds.set([]);
    this.notes.set('');
    this.error.set(null);
  }

  /** Lead sourcing / survey at a point picked on the map. */
  addFieldPoint(d: FieldPointDraft) {
    const b = this.branch();
    if (!b) return;
    const target: TaskTarget = {
      kind: 'Custom',
      refId: null,
      name: d.name,
      address: `${formatCoords(d.location)}, ${b.name}`,
      location: d.location,
      branchId: b.id,
      branchName: b.name,
      matchRadiusMeters: d.radiusMeters,
    };
    const why = this.conflict(d.type, target);
    if (why) {
      this.error.set(`A ${TASK_TYPE[d.type].label.toLowerCase()} at this point is ${why}.`);
      return;
    }
    this.error.set(null);
    this.tasks.update((list) => [...list, { type: d.type, title: this.titleFor(d.type, target), notes: d.notes ?? (this.notes().trim() || null), target }]);
  }

  /** Switch an added task to another type its place allows (e.g. OD member → Member Visit). */
  changeType(index: number, type: TaskType) {
    const task = this.tasks()[index];
    if (!task || task.type === type) return;
    const why = this.conflict(type, task.target, index);
    if (why) {
      this.error.set(`${task.target.name} cannot take a ${TASK_TYPE[type].label.toLowerCase()}: ${why}.`);
      this.tasks.update((list) => [...list]); // re-render the select back to the old value
      return;
    }
    this.error.set(null);
    const oldPrefix = `${TASK_TYPE[task.type].label} – `;
    const title = task.title.startsWith(oldPrefix) ? `${TASK_TYPE[type].label} – ${task.title.slice(oldPrefix.length)}` : task.title;
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
    this.tasks.update((list) => list.map((t, i) => (i === index ? { ...t, title } : t)));
  }
}
