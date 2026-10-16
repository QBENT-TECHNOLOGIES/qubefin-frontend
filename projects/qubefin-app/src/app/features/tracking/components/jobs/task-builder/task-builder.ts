import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { ApiPaths } from 'qubefin-core';
import { GeoTag, GeoTagKind } from '../../../models/geo-tag';
import { JobTaskPoint, NewTaskInput, TaskTarget, TaskTargetKind, TaskType } from '../../../models/job';
import { TrackingLookupStore } from '../../../stores/tracking-lookup-store';
import { formatCoords, toDateKey } from '../../../utils/geo-utils';
import { TARGET_KINDS_FOR, TARGET_KIND_LABEL, targetKey } from '../../../utils/job-rules';
import { TASK_TYPE, optionsOf } from '../../../utils/tracking-labels';
import { MapPickerDialog, MapPickerDialogData, MapPickerDialogResult } from '../../shared/map-picker-dialog/map-picker-dialog';

/**
 * Builds the list of tasks for a job. Every task needs a place: a geo-tagged branch, centre or
 * customer home, or a point picked on the map. Tasks have no time and no order.
 */
@Component({
  selector: 'qfin-task-builder',
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatAutocompleteModule, MatTooltipModule, LucideDynamicIcon],
  templateUrl: './task-builder.html',
})
export class TaskBuilder {
  private readonly dialog = inject(MatDialog);
  readonly lookup = inject(TrackingLookupStore);

  /** The tasks added so far (two-way). */
  readonly tasks = model<NewTaskInput[]>([]);
  /** Branches places may come from; null = every branch in the user's scope. */
  readonly allowedBranchIds = input<string[] | null>(null);
  /** Pending tasks already in the job, to warn about duplicates. */
  readonly existingKeys = input<string[]>([]);
  /** Days the job is active ([start, end], yyyy-MM-dd); places with the same task pending in an overlapping job are blocked. */
  readonly window = input<[string, string] | null>(null);

  readonly typeOptions = optionsOf(TASK_TYPE);
  readonly TASK_TYPE = TASK_TYPE;
  readonly TARGET_KIND_LABEL = TARGET_KIND_LABEL;
  readonly formatCoords = formatCoords;

  readonly type = signal<TaskType>('CentreMeeting');
  readonly kind = signal<TaskTargetKind>('GroupCentre');
  readonly branchId = signal<string | null>(null);
  readonly search = signal('');
  readonly target = signal<TaskTarget | null>(null);
  readonly customName = signal('');
  readonly notes = signal('');
  readonly error = signal<string | null>(null);

  readonly kindOptions = computed(() => TARGET_KINDS_FOR[this.type()].map((value) => ({ value, label: TARGET_KIND_LABEL[value] })));

  readonly branches = computed(() => {
    const allowed = this.allowedBranchIds();
    return this.lookup.branches().filter((b) => !allowed || allowed.includes(b.id));
  });

  /** Branch filter for the search: the chosen one, or every allowed branch. */
  private readonly searchBranchIds = computed(() => {
    const chosen = this.branchId();
    if (chosen) return [chosen];
    return this.allowedBranchIds();
  });

  private readonly placesResource = httpResource<GeoTag[]>(() => {
    const kind = this.kind();
    if (kind === 'Custom') return undefined;
    const params: Record<string, string> = { kind: kind as GeoTagKind, onlyUntagged: 'false' };
    const ids = this.searchBranchIds();
    if (ids?.length) params['branchIds'] = ids.join(',');
    if (this.search().trim()) params['searchText'] = this.search().trim();
    return { url: `${ApiPaths.TRACKING}/geo-tags`, params };
  });
  readonly places = computed(() => (this.placesResource.value() ?? []).filter((p) => !!p.location).slice(0, 40));
  readonly placesLoading = computed(() => this.placesResource.isLoading());

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

  constructor() {
    // Keep the branch choice valid when the allowed branches change (e.g. assignee picked).
    effect(() => {
      const list = this.branches();
      const current = this.branchId();
      if (list.length === 1) this.branchId.set(list[0].id);
      else if (current && !list.some((b) => b.id === current)) this.branchId.set(null);
    });
  }

  onTypeChange(type: TaskType) {
    this.type.set(type);
    this.kind.set(TARGET_KINDS_FOR[type][0]);
    this.resetPlace();
  }

  onKindChange(kind: TaskTargetKind) {
    this.kind.set(kind);
    this.resetPlace();
  }

  onBranchChange(id: string | null) {
    this.branchId.set(id);
    this.resetPlace();
  }

  private resetPlace() {
    this.target.set(null);
    this.search.set('');
    this.customName.set('');
    this.error.set(null);
  }

  selectPlace(e: MatAutocompleteSelectedEvent) {
    const tag = e.option.value as GeoTag;
    this.search.set(tag.name);
    this.error.set(null);
    this.target.set({
      kind: this.kind(),
      refId: tag.refId,
      name: tag.name,
      address: tag.address ?? tag.branchName,
      location: tag.location!,
      branchId: tag.branchId,
      branchName: tag.branchName,
      matchRadiusMeters: Math.min(tag.radiusMeters, 500),
    });
  }

  displayPlace = (v: GeoTag | string | null) => (typeof v === 'string' ? v : (v?.name ?? ''));

  /** Why this place cannot take this task type now, or null. */
  isUsed(tag: GeoTag): string | null {
    const key = targetKey(this.type(), { kind: this.kind(), refId: tag.refId } as TaskTarget);
    if (this.keysInList().has(key)) return 'already in this list';
    if (this.keysInJob().has(key)) return 'already pending in this job';
    const w = this.window();
    const hit = (this.pendingByKey().get(key) ?? []).find((p) => !w || (p.jobStartFrom <= w[1] && w[0] <= this.activeEnd(p.jobCompleteBy)));
    return hit ? `pending in ${hit.jobNo}${hit.assigneeName ? ' (' + hit.assigneeName + ')' : ''}` : null;
  }

  /** An overdue job is still active today. */
  private activeEnd(completeBy: string) {
    const today = toDateKey();
    return completeBy < today ? today : completeBy;
  }

  pickOnMap() {
    const branch = this.lookup.branchById().get(this.branchId() ?? '') ?? this.branches()[0];
    if (!branch) return;
    this.dialog
      .open<MapPickerDialog, MapPickerDialogData, MapPickerDialogResult>(MapPickerDialog, {
        data: {
          title: 'Task location',
          subtitle: `Inside ${branch.name} branch area. Arrival and the completion photo are checked against this point.`,
          location: this.target()?.location ?? null,
          radiusMeters: this.target()?.matchRadiusMeters ?? 300,
          fallbackCenter: branch.location,
          requireReason: false,
          color: TASK_TYPE[this.type()].color,
        },
        panelClass: 'glass-modal',
        maxWidth: '96vw',
      })
      .afterClosed()
      .subscribe((res) => {
        if (!res) return;
        this.error.set(null);
        this.target.set({
          kind: 'Custom',
          refId: null,
          name: this.customName().trim() || 'Field location',
          address: `${formatCoords(res.location)}, ${branch.name}`,
          location: res.location,
          branchId: branch.id,
          branchName: branch.name,
          matchRadiusMeters: res.radiusMeters,
        });
      });
  }

  add() {
    let target = this.target();
    if (!target) {
      this.error.set(this.kind() === 'Custom' ? 'Pick the point on the map.' : 'Choose a geo-tagged place from the list.');
      return;
    }
    if (target.kind === 'Custom') {
      const name = this.customName().trim();
      if (!name) {
        this.error.set('Give the place a name, e.g. "Jateswar market".');
        return;
      }
      target = { ...target, name };
    }
    const type = this.type();
    const key = targetKey(type, target);
    if (this.keysInList().has(key)) {
      this.error.set(`A ${TASK_TYPE[type].label.toLowerCase()} for ${target.name} is already in the list.`);
      return;
    }
    if (this.keysInJob().has(key)) {
      this.error.set(`This job already has a pending ${TASK_TYPE[type].label.toLowerCase()} for ${target.name}.`);
      return;
    }
    if (target.refId) {
      const why = this.isUsed({ refId: target.refId } as GeoTag);
      if (why) {
        this.error.set(`${target.name} already has a ${TASK_TYPE[type].label.toLowerCase()} ${why}. Pick another place or wait until that job is done.`);
        return;
      }
    }
    const placeName = target.name.replace(/ \([A-Z]{3}-C\d+\)$/, '');
    this.tasks.update((list) => [...list, { type, title: `${TASK_TYPE[type].label} – ${placeName}`, notes: this.notes().trim() || null, target: target! }]);
    this.resetPlace();
    this.notes.set('');
  }

  remove(index: number) {
    this.tasks.update((list) => list.filter((_, i) => i !== index));
  }

  rename(index: number, title: string) {
    this.tasks.update((list) => list.map((t, i) => (i === index ? { ...t, title } : t)));
  }
}
