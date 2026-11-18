import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LiveSocketService, LiveSocketState } from '../../../services/live-socket.service';

const LABEL: Record<LiveSocketState, string> = {
  Live: 'Live',
  Connecting: 'Connecting…',
  Reconnecting: 'Reconnecting…',
  Off: 'Live off',
  Denied: 'Live blocked',
};

/** State of the live GPS / alarm connection: <qfin-trk-live-badge />. Shows nothing when no live socket is configured. */
@Component({
  selector: 'qfin-trk-live-badge',
  imports: [MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [DatePipe],
  template: `
    @if (socket.enabled) {
      <span class="trk-live-badge" [attr.data-state]="socket.state()" [matTooltip]="tooltip()">
        <span class="trk-live-dot"></span>{{ label() }}
      </span>
    }
  `,
})
export class LiveBadge {
  readonly socket = inject(LiveSocketService);
  private readonly date = inject(DatePipe);

  readonly label = computed(() => LABEL[this.socket.state()]);
  readonly tooltip = computed(() => {
    switch (this.socket.state()) {
      case 'Live': {
        const last = this.socket.lastMessageAt();
        return `GPS and alarms arrive as they happen${last ? ` · last message ${this.date.transform(last, 'hh:mm:ss a')}` : ''}. The 30 s refresh continues.`;
      }
      case 'Reconnecting':
        return 'Live connection lost; retrying every 5 s. The 30 s refresh continues.';
      case 'Connecting':
        return 'Connecting to live GPS and alarms…';
      case 'Denied':
        return 'The live server refused the team’s GPS / alarm topics (it allows only your own). Retrying every 5 min; the 30 s refresh continues.';
      default:
        return 'Live updates are off; the screen refreshes every 30 s.';
    }
  });
}
