import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { Tone } from '../../../utils/tracking-labels';

/** Small status pill: <qfin-trk-chip [tone]="TASK_STATUS[task.status]" />. */
@Component({
  selector: 'qfin-trk-chip',
  imports: [LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="trk-chip {{ tone().classes }}" [class.trk-chip-sm]="small()">
      @if (showIcon()) {
        <svg [lucideIcon]="tone().icon" class="w-3.5 h-3.5"></svg>
      }
      {{ label() ?? tone().label }}
    </span>
  `,
})
export class TrackingChip {
  readonly tone = input.required<Tone>();
  readonly label = input<string | null>(null);
  readonly showIcon = input(true);
  readonly small = input(false);
}
