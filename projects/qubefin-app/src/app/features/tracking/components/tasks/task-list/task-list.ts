import { DatePipe, NgClass } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { TrackingTask } from '../../../models/tracking-task';
import { TASK_PRIORITY, TASK_STATUS, TASK_TYPE, Tone } from '../../../utils/tracking-labels';
import { TrackingChip } from '../../shared/tracking-chip/tracking-chip';

const OPEN = new Set(['Assigned', 'Arrived', 'InProgress']);

@Component({
  selector: 'qfin-task-list',
  imports: [NgClass, DatePipe, MatTableModule, MatSortModule, MatTooltipModule, LucideDynamicIcon, TrackingChip],
  templateUrl: './task-list.html',
})
export class TaskList {
  readonly data = input<TrackingTask[]>([]);
  readonly selectedId = input<string | null>(null);
  readonly isCollapsed = input(false);
  readonly selectable = input(true);
  readonly selectedIds = input<ReadonlySet<string>>(new Set());
  readonly sortOn = input('dueBy');
  readonly sortDirection = input<'asc' | 'desc'>('asc');

  readonly viewDetail = output<string>();
  readonly selectionChange = output<Set<string>>();
  readonly sortChange = output<Sort>();

  /** Widened for mat-table rows, which are typed `any` in templates. */
  readonly TASK_STATUS: Record<string, Tone> = TASK_STATUS;
  readonly TASK_TYPE: Record<string, Tone> = TASK_TYPE;
  readonly TASK_PRIORITY: Record<string, Tone> = TASK_PRIORITY;

  readonly columns = computed(() => {
    if (this.isCollapsed()) return ['task', 'action'];
    const cols = ['task', 'assigneeName', 'scheduledDate', 'source', 'status', 'action'];
    return this.selectable() ? ['select', ...cols] : cols;
  });

  readonly selectableRows = computed(() => this.data().filter((t) => OPEN.has(t.status)));
  readonly allSelected = computed(
    () => this.selectableRows().length > 0 && this.selectableRows().every((t) => this.selectedIds().has(t.id)),
  );
  readonly someSelected = computed(() => !this.allSelected() && this.selectableRows().some((t) => this.selectedIds().has(t.id)));

  isOpen(t: TrackingTask) {
    return OPEN.has(t.status);
  }

  toggle(id: string, checked: boolean) {
    const next = new Set(this.selectedIds());
    if (checked) next.add(id);
    else next.delete(id);
    this.selectionChange.emit(next);
  }

  toggleAll(checked: boolean) {
    const next = new Set(this.selectedIds());
    this.selectableRows().forEach((t) => (checked ? next.add(t.id) : next.delete(t.id)));
    this.selectionChange.emit(next);
  }
}
