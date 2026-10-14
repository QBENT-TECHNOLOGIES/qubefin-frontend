import { NgClass } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute } from '@angular/router';
import { Sort } from '@angular/material/sort';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import { TaskStatus } from '../../models/tracking-task';
import { TrackingTaskService } from '../../services/tracking-task-service';
import { TrackingLookupStore } from '../../stores/tracking-lookup-store';
import { TrackingTaskStore } from '../../stores/tracking-task-store';
import { ROLE_LABEL, TASK_STATUS, TASK_TYPE, optionsOf } from '../../utils/tracking-labels';
import { pollWhileVisible } from '../../utils/poll';
import { toDateKey } from '../../utils/geo-utils';
import {
  AssignOfficerDialog,
  AssignOfficerDialogData,
  AssignOfficerDialogResult,
} from '../../components/shared/assign-officer-dialog/assign-officer-dialog';
import { TaskForm } from '../../components/tasks/task-form/task-form';
import { TaskList } from '../../components/tasks/task-list/task-list';
import { TaskView } from '../../components/tasks/task-view/task-view';

@Component({
  selector: 'qfin-task-assignment',
  imports: [
    NgClass,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatPaginatorModule,
    MatTooltipModule,
    LucideDynamicIcon,
    TaskList,
    TaskView,
    TaskForm,
  ],
  templateUrl: './task-assignment.html',
})
export class TaskAssignment {
  readonly store = inject(TrackingTaskStore);
  readonly lookup = inject(TrackingLookupStore);
  private readonly service = inject(TrackingTaskService);
  private readonly alerts = inject(AlertService);
  private readonly dialog = inject(MatDialog);

  readonly EMPTY_UUID = EMPTY_UUID;
  readonly statusOptions = optionsOf(TASK_STATUS);
  readonly typeOptions = optionsOf(TASK_TYPE);
  readonly ROLE_LABEL = ROLE_LABEL;

  readonly isViewMode = signal(true);
  readonly selectedTaskId = signal<string>(EMPTY_UUID);
  readonly showFilters = signal(true);
  readonly selectedIds = signal<ReadonlySet<string>>(new Set());
  readonly searchDraft = signal(this.store.searchText());

  readonly hasPanel = computed(() => this.selectedTaskId() !== EMPTY_UUID || !this.isViewMode());

  readonly kpis = computed(() => {
    const s = this.store.summary();
    return [
      { key: null, label: 'All tasks', value: s.total, icon: 'clipboard-list', color: '#334155' },
      { key: 'Assigned' as TaskStatus, label: 'Not started', value: s.assigned, icon: 'clock', color: '#2563EB' },
      { key: 'InProgress' as TaskStatus, label: 'On site', value: s.inProgress, icon: 'activity', color: '#7C3AED' },
      { key: 'Completed' as TaskStatus, label: 'Completed', value: s.completed, icon: 'circle-check', color: '#16A34A' },
      { key: 'Missed' as TaskStatus, label: 'Missed', value: s.missed, icon: 'circle-x', color: '#E11D48' },
    ];
  });

  constructor() {
    // Deep link from other screens: /secure/tracking/tasks?task=<id>
    const taskId = inject(ActivatedRoute).snapshot.queryParamMap.get('task');
    if (taskId) this.onView(taskId);

    // Keep progress fresh while someone is watching the list.
    pollWhileVisible(() => {
      this.store.refreshList();
      if (this.selectedTaskId() !== EMPTY_UUID && this.isViewMode()) this.store.refreshDetail();
    });
  }

  // --- Filters ---------------------------------------------------------------------------
  applySearch() {
    this.store.setFilter(this.store.searchText, this.searchDraft().trim());
  }

  filterKpi(status: TaskStatus | null) {
    // "On site" = InProgress; the API treats status=InProgress as Arrived + InProgress.
    this.store.setFilter(this.store.status, this.store.status() === status ? null : status);
  }

  setToday() {
    this.store.fromDate.set(toDateKey());
    this.store.setFilter(this.store.toDate, toDateKey());
  }

  resetFilters() {
    this.searchDraft.set('');
    this.store.searchText.set('');
    this.store.status.set(null);
    this.store.type.set(null);
    this.store.source.set(null);
    this.store.branchId.set(null);
    this.store.assigneeId.set(null);
    this.setToday();
  }

  onPage(e: PageEvent) {
    this.store.pageSize.set(e.pageSize);
    this.store.pageIndex.set(e.pageIndex);
  }

  onSort(e: Sort) {
    this.store.sortOn.set(e.active);
    this.store.setFilter(this.store.sortDirection, (e.direction || 'asc') as 'asc' | 'desc');
  }

  // --- Panel -----------------------------------------------------------------------------
  onView(id: string) {
    this.selectedTaskId.set(id);
    this.isViewMode.set(true);
  }

  onAdd() {
    this.selectedTaskId.set(EMPTY_UUID);
    this.isViewMode.set(false);
  }

  onSaved(id: string) {
    this.isViewMode.set(true);
    this.selectedTaskId.set(id);
  }

  closePanel() {
    this.selectedTaskId.set(EMPTY_UUID);
    this.isViewMode.set(true);
  }

  // --- Bulk reassign ---------------------------------------------------------------------
  clearSelection() {
    this.selectedIds.set(new Set());
  }

  bulkReassign() {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;
    const branches = new Set(this.store.tasks().filter((t) => ids.includes(t.id)).map((t) => t.branchId));
    this.dialog
      .open<AssignOfficerDialog, AssignOfficerDialogData, AssignOfficerDialogResult>(AssignOfficerDialog, {
        data: {
          title: `Reassign ${ids.length} task${ids.length > 1 ? 's' : ''}`,
          subtitle: 'All selected open tasks move to one employee. Each change is written to the audit trail.',
          branchId: branches.size === 1 ? [...branches][0] : null,
          remarksRequired: true,
          confirmText: 'Reassign all',
        },
        panelClass: 'glass-modal',
        maxWidth: '95vw',
      })
      .afterClosed()
      .subscribe((res) => {
        if (!res) return;
        this.service.bulkReassign({ taskIds: ids, assigneeId: res.assigneeId, remarks: res.remarks }).subscribe((r) => {
          this.alerts.toast('success', `${r.updated} task${r.updated > 1 ? 's' : ''} reassigned`);
          this.selectedIds.set(new Set());
          this.store.refreshList();
          if (this.selectedTaskId() !== EMPTY_UUID) this.store.refreshDetail();
        });
      });
  }
}
