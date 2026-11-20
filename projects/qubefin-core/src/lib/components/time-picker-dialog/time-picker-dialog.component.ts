import {
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';

export interface TimePickerDialogData {
  title?: string;
  currentHour?: number; // 1-12
  currentMinute?: number; // 0-59
  currentPeriod?: 'AM' | 'PM';
  minuteInterval?: number; // default 1
}

export interface TimePickerDialogResult {
  hour: number;
  minute: number;
  period: 'AM' | 'PM';
  formatted: string; // e.g. "10:45 AM"
}

type Period = 'AM' | 'PM';

/**
 * Height of one wheel row in px - must match the `h-9` on the rows and the selection band. The wheel
 * shows five rows and is padded by two rows top and bottom, so row `i` sits in the band exactly when
 * `scrollTop === i * ROW_HEIGHT`. Reading the selection off scrollTop (rather than measuring rects)
 * keeps it right while the dialog is still scaling in.
 */
const ROW_HEIGHT = 36;

@Component({
  selector: 'qfin-time-picker-dialog',
  imports: [MatDialogModule],
  templateUrl: './time-picker-dialog.component.html',
  styleUrls: ['./time-picker-dialog.component.css'],
})
export class TimePickerDialogComponent {
  readonly dialogRef = inject<MatDialogRef<TimePickerDialogComponent, TimePickerDialogResult>>(MatDialogRef);
  readonly data = inject<TimePickerDialogData>(MAT_DIALOG_DATA);

  private readonly interval = Math.min(Math.max(Math.floor(this.data.minuteInterval ?? 1), 1), 60);

  readonly hours = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
  readonly minutes = Array.from({ length: Math.ceil(60 / this.interval) }, (_, i) => i * this.interval);
  readonly periods: Period[] = ['AM', 'PM'];

  readonly selectedHour = signal(this.hours.includes(this.data.currentHour ?? -1) ? this.data.currentHour! : 12);
  readonly selectedMinute = signal(this.nearestMinute(this.data.currentMinute ?? 0));
  readonly selectedPeriod = signal<Period>(this.data.currentPeriod ?? 'AM');

  readonly formatted = computed(
    () => `${this.selectedHour()}:${this.pad(this.selectedMinute())} ${this.selectedPeriod()}`,
  );

  private readonly hourList = viewChild.required<ElementRef<HTMLDivElement>>('hourList');
  private readonly minuteList = viewChild.required<ElementRef<HTMLDivElement>>('minuteList');

  constructor() {
    // The panel's own surface would otherwise show its background and corners around the card.
    this.dialogRef.addPanelClass('qfin-time-picker-panel');

    // Place both wheels before the first paint, so they open already on the selected values.
    afterNextRender(() => this.syncWheels('instant'));
  }

  pad(n: number): string {
    return n.toString().padStart(2, '0');
  }

  // ============================================================
  // SELECTION
  // ============================================================

  /** A click scrolls the row into the band; the scroll handler then keeps the selection on it. */
  selectHour(hour: number): void {
    this.selectedHour.set(hour);
    this.scrollWheel(this.hourList().nativeElement, this.hours.indexOf(hour), 'smooth');
  }

  selectMinute(minute: number): void {
    this.selectedMinute.set(minute);
    this.scrollWheel(this.minuteList().nativeElement, this.minutes.indexOf(minute), 'smooth');
  }

  selectPeriod(period: Period): void {
    this.selectedPeriod.set(period);
  }

  setNow(): void {
    const now = new Date();

    // Round on the whole day so 10:58 with a 5-minute step becomes 11:00, not 10:00.
    const rounded = Math.round((now.getHours() * 60 + now.getMinutes()) / this.interval) * this.interval;
    const total = rounded % (24 * 60);
    const h24 = Math.floor(total / 60);

    this.selectedPeriod.set(h24 >= 12 ? 'PM' : 'AM');
    this.selectedHour.set(h24 % 12 === 0 ? 12 : h24 % 12);
    this.selectedMinute.set(this.nearestMinute(total % 60));

    this.syncWheels('smooth');
  }

  onConfirm(): void {
    this.dialogRef.close({
      hour: this.selectedHour(),
      minute: this.selectedMinute(),
      period: this.selectedPeriod(),
      formatted: this.formatted(),
    });
  }

  // ============================================================
  // WHEELS
  // ============================================================

  // Reading the row off scrollTop is cheap and setting a signal to its current value is a no-op, so the
  // selection follows every scroll event directly - no frame throttling needed.
  onHourScroll(): void {
    this.selectedHour.set(this.hours[this.centeredIndex(this.hourList().nativeElement, this.hours.length)]);
  }

  onMinuteScroll(): void {
    this.selectedMinute.set(this.minutes[this.centeredIndex(this.minuteList().nativeElement, this.minutes.length)]);
  }

  /** Up/Down step one row, Home/End jump to the ends - the wheels are focusable, so they work by keyboard. */
  onWheelKeydown(event: KeyboardEvent, wheel: 'hour' | 'minute'): void {
    const values = wheel === 'hour' ? this.hours : this.minutes;
    const current = values.indexOf(wheel === 'hour' ? this.selectedHour() : this.selectedMinute());

    let next: number;

    switch (event.key) {
      case 'ArrowUp':
        next = current - 1;
        break;
      case 'ArrowDown':
        next = current + 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = values.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    next = Math.min(Math.max(next, 0), values.length - 1);

    if (wheel === 'hour') {
      this.selectHour(values[next]);
    } else {
      this.selectMinute(values[next]);
    }
  }

  private syncWheels(behavior: ScrollBehavior): void {
    this.scrollWheel(this.hourList().nativeElement, this.hours.indexOf(this.selectedHour()), behavior);
    this.scrollWheel(this.minuteList().nativeElement, this.minutes.indexOf(this.selectedMinute()), behavior);
  }

  private scrollWheel(el: HTMLDivElement, index: number, behavior: ScrollBehavior): void {
    if (index < 0) {
      return;
    }

    el.scrollTo({ top: index * ROW_HEIGHT, behavior });
  }

  private centeredIndex(el: HTMLDivElement, count: number): number {
    return Math.min(Math.max(Math.round(el.scrollTop / ROW_HEIGHT), 0), count - 1);
  }

  /** Snaps a minute that isn't on the step (7 with a 5-minute step) to the closest one on the wheel. */
  private nearestMinute(minute: number): number {
    return this.minutes.reduce((best, value) =>
      Math.abs(value - minute) < Math.abs(best - minute) ? value : best,
    );
  }
}
