import { httpResource } from '@angular/common/http';
import { Component, computed, inject, output, signal } from '@angular/core';
import { FormField, Schema, form, required, schema } from '@angular/forms/signals';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService, ApiPaths } from 'qubefin-core';
import { GeoTag, GeoTagKind } from '../../../models/geo-tag';
import { TaskPriority, TaskTarget, TaskTargetKind, TaskType } from '../../../models/tracking-task';
import { TrackingTaskService } from '../../../services/tracking-task-service';
import { TrackingLookupStore } from '../../../stores/tracking-lookup-store';
import { TrackingTaskStore } from '../../../stores/tracking-task-store';
import { formatCoords, toDateKey } from '../../../utils/geo-utils';
import { ROLE_LABEL, TASK_PRIORITY, TASK_TYPE, optionsOf } from '../../../utils/tracking-labels';
import {
  MapPickerDialog,
  MapPickerDialogData,
  MapPickerDialogResult,
} from '../../shared/map-picker-dialog/map-picker-dialog';

interface TaskFormModel {
  type: TaskType;
  title: string;
  priority: TaskPriority;
  assigneeId: string;
  scheduledDate: string;
  dueTime: string;
  description: string;
}

const DEFAULT_KIND: Record<TaskType, TaskTargetKind> = {
  CustomerVisit: 'Customer',
  OdFollowUp: 'OdCustomer',
  GroupMeeting: 'GroupCentre',
  Survey: 'Custom',
  LeadSourcing: 'Custom',
  Other: 'Custom',
};

const KIND_LABEL: Record<TaskTargetKind, string> = {
  Customer: 'Customer home',
  OdCustomer: 'Overdue customer home',
  GroupCentre: 'Group / centre',
  Branch: 'Branch',
  Custom: 'Custom location (pick on map)',
};

@Component({
  selector: 'qfin-task-form',
  imports: [FormField, MatFormFieldModule, MatInputModule, MatSelectModule, MatAutocompleteModule, LucideDynamicIcon],
  templateUrl: './task-form.html',
})
export class TaskForm {
  private readonly service = inject(TrackingTaskService);
  private readonly store = inject(TrackingTaskStore);
  private readonly alerts = inject(AlertService);
  private readonly dialog = inject(MatDialog);
  readonly lookup = inject(TrackingLookupStore);

  readonly cancel = output<void>();
  readonly saved = output<string>();

  readonly typeOptions = optionsOf(TASK_TYPE);
  readonly priorityOptions = optionsOf(TASK_PRIORITY);
  readonly kindOptions = (Object.keys(KIND_LABEL) as TaskTargetKind[]).map((value) => ({ value, label: KIND_LABEL[value] }));
  readonly ROLE_LABEL = ROLE_LABEL;
  readonly formatCoords = formatCoords;
  readonly today = toDateKey();
  readonly saving = signal(false);
  readonly submitted = signal(false);

  protected readonly model = signal<TaskFormModel>({
    type: 'CustomerVisit',
    title: '',
    priority: 'Normal',
    assigneeId: '',
    scheduledDate: toDateKey(),
    dueTime: '17:00',
    description: '',
  });

  protected readonly taskSchema: Schema<TaskFormModel> = schema((p) => {
    required(p.title, { message: 'Title is required' });
    required(p.assigneeId, { message: 'Select an employee' });
    required(p.scheduledDate, { message: 'Date is required' });
    required(p.dueTime, { message: 'Due time is required' });
  });

  protected readonly taskForm = form(this.model, this.taskSchema);

  // --- Target -------------------------------------------------------------------------------
  readonly targetKind = signal<TaskTargetKind>('Customer');
  readonly targetSearch = signal('');
  readonly target = signal<TaskTarget | null>(null);
  readonly customName = signal('');

  /** Geo-tagged places of the chosen kind, filtered by the assignee's branch when known. */
  private readonly placesResource = httpResource<GeoTag[]>(() => {
    const kind = this.targetKind();
    if (kind === 'Custom') return undefined;
    const params: Record<string, string> = { kind: kind as GeoTagKind, onlyUntagged: 'false' };
    const officer = this.lookup.officerById().get(this.model().assigneeId);
    if (officer && officer.role !== 'AM' && officer.role !== 'DM') params['branchId'] = officer.branchId;
    if (this.targetSearch().trim()) params['searchText'] = this.targetSearch().trim();
    return { url: `${ApiPaths.TRACKING}/geo-tags`, params };
  });
  readonly places = computed(() => (this.placesResource.value() ?? []).filter((p) => !!p.location).slice(0, 30));
  readonly placesLoading = computed(() => this.placesResource.isLoading());

  onTypeChange(type: TaskType) {
    this.targetKind.set(DEFAULT_KIND[type]);
    this.target.set(null);
    this.targetSearch.set('');
  }

  onKindChange(kind: TaskTargetKind) {
    this.targetKind.set(kind);
    this.target.set(null);
    this.targetSearch.set('');
  }

  selectPlace(e: MatAutocompleteSelectedEvent) {
    const tag = e.option.value as GeoTag;
    this.targetSearch.set(tag.name);
    this.target.set({
      kind: this.targetKind(),
      refId: tag.refId,
      name: tag.name,
      address: tag.address ?? tag.branchName,
      location: tag.location!,
      matchRadiusMeters: Math.min(tag.radiusMeters, 500),
    });
    if (!this.model().title.trim()) {
      this.model.update((m) => ({ ...m, title: `${TASK_TYPE[m.type].label} – ${tag.name}` }));
    }
  }

  displayPlace = (v: GeoTag | string | null) => (typeof v === 'string' ? v : (v?.name ?? ''));

  pickOnMap() {
    const officer = this.lookup.officerById().get(this.model().assigneeId);
    const branch = officer ? this.lookup.branchById().get(officer.branchId) : undefined;
    this.dialog
      .open<MapPickerDialog, MapPickerDialogData, MapPickerDialogResult>(MapPickerDialog, {
        data: {
          title: 'Task location',
          location: this.target()?.location ?? null,
          radiusMeters: this.target()?.matchRadiusMeters ?? 200,
          fallbackCenter: branch?.location ?? null,
          requireReason: false,
          color: TASK_TYPE[this.model().type].color,
        },
        panelClass: 'glass-modal',
        maxWidth: '96vw',
      })
      .afterClosed()
      .subscribe((res) => {
        if (!res) return;
        const name = this.customName().trim() || this.model().title.trim() || 'Field location';
        this.target.set({ kind: 'Custom', refId: null, name, address: formatCoords(res.location), location: res.location, matchRadiusMeters: res.radiusMeters });
      });
  }

  submit() {
    this.submitted.set(true);
    this.taskForm().markAsTouched();
    const target = this.target();
    if (!this.taskForm().valid() || !target) return;

    const m = this.model();
    const dueBy = new Date(`${m.scheduledDate}T${m.dueTime}:00`);
    if (dueBy.getTime() < Date.now()) {
      this.alerts.warning('Due time has passed', 'Choose a due time later than now.');
      return;
    }
    const finalTarget = target.kind === 'Custom' && this.customName().trim() ? { ...target, name: this.customName().trim() } : target;

    this.saving.set(true);
    this.service
      .create({
        type: m.type,
        title: m.title.trim(),
        description: m.description.trim() || null,
        priority: m.priority,
        assigneeId: m.assigneeId,
        target: finalTarget,
        scheduledDate: m.scheduledDate,
        dueBy: dueBy.toISOString(),
      })
      .subscribe({
        next: (task) => {
          this.saving.set(false);
          this.alerts.success('Task assigned', `${task.taskNo} sent to ${task.assigneeName}.`).then(() => {
            this.store.refreshList();
            this.saved.emit(task.id);
          });
        },
        error: () => this.saving.set(false),
      });
  }
}
