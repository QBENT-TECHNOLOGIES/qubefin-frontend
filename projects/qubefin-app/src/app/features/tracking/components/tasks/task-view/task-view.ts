import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import { TaskHistoryAction } from '../../../models/tracking-task';
import { TrackingTaskService } from '../../../services/tracking-task-service';
import { TrackingTaskStore } from '../../../stores/tracking-task-store';
import { formatCoords, googleMapsLink } from '../../../utils/geo-utils';
import { ROLE_LABEL, TASK_PRIORITY, TASK_STATUS, TASK_TYPE } from '../../../utils/tracking-labels';
import {
  AssignOfficerDialog,
  AssignOfficerDialogData,
  AssignOfficerDialogResult,
} from '../../shared/assign-officer-dialog/assign-officer-dialog';
import { RemarksDialog, RemarksDialogData } from '../../shared/remarks-dialog/remarks-dialog';
import { TrackingChip } from '../../shared/tracking-chip/tracking-chip';
import { TaskEvidence } from '../task-evidence/task-evidence';
import { TaskTimeline } from '../task-timeline/task-timeline';

const HISTORY_ICON: Record<TaskHistoryAction, string> = {
  Created: 'plus',
  Assigned: 'user-check',
  Reassigned: 'users',
  Cancelled: 'x',
  Arrived: 'map-pin',
  Started: 'activity',
  Completed: 'circle-check',
  MarkedMissed: 'circle-x',
};

@Component({
  selector: 'qfin-task-view',
  imports: [DatePipe, RouterLink, MatTooltipModule, LucideDynamicIcon, TrackingChip, TaskTimeline, TaskEvidence],
  templateUrl: './task-view.html',
})
export class TaskView {
  private readonly store = inject(TrackingTaskStore);
  private readonly service = inject(TrackingTaskService);
  private readonly alerts = inject(AlertService);
  private readonly dialog = inject(MatDialog);

  readonly taskId = input<string>(EMPTY_UUID);
  readonly changed = output<void>();

  readonly task = this.store.task;
  readonly loading = this.store.taskLoading;
  readonly history = this.store.history;

  readonly TASK_STATUS = TASK_STATUS;
  readonly TASK_TYPE = TASK_TYPE;
  readonly TASK_PRIORITY = TASK_PRIORITY;
  readonly ROLE_LABEL = ROLE_LABEL;
  readonly HISTORY_ICON = HISTORY_ICON;
  readonly formatCoords = formatCoords;
  readonly googleMapsLink = googleMapsLink;

  readonly canChange = computed(() => {
    const s = this.task()?.status;
    return s === 'Assigned' || s === 'Arrived' || s === 'InProgress';
  });

  constructor() {
    effect(() => this.store.setTaskId(this.taskId()));
  }

  reassign() {
    const t = this.task();
    if (!t) return;
    this.dialog
      .open<AssignOfficerDialog, AssignOfficerDialogData, AssignOfficerDialogResult>(AssignOfficerDialog, {
        data: {
          title: `Reassign ${t.taskNo}`,
          subtitle: t.status === 'Assigned' ? t.title : 'Progress recorded so far will be cleared for the new assignee.',
          currentAssigneeId: t.assigneeId,
          branchId: t.branchId,
          remarksRequired: true,
          confirmText: 'Reassign',
        },
        panelClass: 'glass-modal',
        maxWidth: '95vw',
      })
      .afterClosed()
      .subscribe((res) => {
        if (!res) return;
        this.service.reassign(t.id, { assigneeId: res.assigneeId, remarks: res.remarks }).subscribe(() => {
          this.alerts.toast('success', `${t.taskNo} reassigned`);
          this.afterChange();
        });
      });
  }

  cancelTask() {
    const t = this.task();
    if (!t) return;
    this.dialog
      .open<RemarksDialog, RemarksDialogData, string>(RemarksDialog, {
        data: {
          title: `Cancel ${t.taskNo}?`,
          message: `${t.assigneeName} will no longer see this task. This is recorded in the audit trail.`,
          label: 'Reason for cancelling',
          confirmText: 'Cancel task',
          icon: 'trash-2',
          tone: 'danger',
        },
        panelClass: 'glass-modal',
        maxWidth: '95vw',
      })
      .afterClosed()
      .subscribe((remarks) => {
        if (!remarks) return;
        this.service.cancel(t.id, { remarks }).subscribe(() => {
          this.alerts.toast('success', `${t.taskNo} cancelled`);
          this.afterChange();
        });
      });
  }

  private afterChange() {
    this.store.refreshDetail();
    this.store.refreshList();
    this.changed.emit();
  }
}
