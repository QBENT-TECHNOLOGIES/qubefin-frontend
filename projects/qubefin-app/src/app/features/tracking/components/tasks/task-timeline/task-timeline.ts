import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { TrackingTask } from '../../../models/tracking-task';
import { minutesBetween } from '../../../utils/geo-utils';

interface Step {
  key: string;
  label: string;
  icon: string;
  at: string | null;
  note: string | null;
  state: 'done' | 'current' | 'pending' | 'failed';
}

/** Assigned → Arrived → Started → Completed, with server timestamps and gaps between steps. */
@Component({
  selector: 'qfin-task-timeline',
  imports: [DatePipe, LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './task-timeline.html',
})
export class TaskTimeline {
  readonly task = input.required<TrackingTask>();
  readonly compact = input(false);

  readonly steps = computed<Step[]>(() => {
    const t = this.task();
    const tl = t.timeline;
    const failed = t.status === 'Missed' || t.status === 'Cancelled';
    const gap = (a: string | null, b: string | null, suffix: string) => {
      const m = minutesBetween(a, b);
      return m === null ? null : `${m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`} ${suffix}`;
    };
    const state = (at: string | null, prevDone: boolean): Step['state'] =>
      at ? 'done' : failed ? 'failed' : prevDone ? 'current' : 'pending';

    const steps: Step[] = [
      { key: 'assigned', label: 'Assigned', icon: 'clipboard-list', at: tl.assignedAt, note: `by ${t.assignedByName}`, state: 'done' },
      { key: 'arrived', label: 'Arrived at location', icon: 'map-pin', at: tl.arrivedAt, note: null, state: state(tl.arrivedAt, true) },
      { key: 'started', label: 'Started', icon: 'activity', at: tl.startedAt, note: gap(tl.arrivedAt, tl.startedAt, 'after arrival'), state: state(tl.startedAt, !!tl.arrivedAt) },
      { key: 'completed', label: 'Completed', icon: 'circle-check', at: tl.completedAt, note: gap(tl.startedAt ?? tl.arrivedAt, tl.completedAt, 'on site'), state: state(tl.completedAt, !!tl.startedAt) },
    ];
    if (t.status === 'Missed') steps.push({ key: 'missed', label: 'Marked missed', icon: 'circle-x', at: t.dueBy, note: 'Not completed by due time', state: 'failed' });
    if (t.status === 'Cancelled') steps.push({ key: 'cancelled', label: 'Cancelled', icon: 'x', at: null, note: null, state: 'failed' });
    return steps;
  });

  readonly lateBy = computed(() => {
    const t = this.task();
    const end = t.timeline.completedAt ?? (t.status === 'Completed' ? null : new Date().toISOString());
    const m = minutesBetween(t.dueBy, end);
    return m !== null && m > 0 ? m : null;
  });
}
