import { Component, Inject, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

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

@Component({
  selector: 'qfin-time-picker-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  templateUrl: './time-picker-dialog.component.html',
  styleUrls: ['./time-picker-dialog.component.css'],
})
export class TimePickerDialogComponent implements AfterViewInit {
  readonly hours = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
  readonly minutes: number[];
  readonly periods: ('AM' | 'PM')[] = ['AM', 'PM'];

  private hourScrollFrame: number | null = null;
  private minuteScrollFrame: number | null = null;

  selectedHour: number;
  selectedMinute: number;
  selectedPeriod: 'AM' | 'PM';

  @ViewChild('hourList') hourList?: ElementRef<HTMLDivElement>;
  @ViewChild('minuteList') minuteList?: ElementRef<HTMLDivElement>;

  constructor(
    public dialogRef: MatDialogRef<TimePickerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TimePickerDialogData,
  ) {
    const interval = data.minuteInterval ?? 1;
    this.minutes = Array.from({ length: Math.ceil(60 / interval) }, (_, i) => i * interval);
    this.selectedHour = data.currentHour ?? 12;
    this.selectedMinute = data.currentMinute ?? 0;
    this.selectedPeriod = data.currentPeriod ?? 'AM';
  }

  ngAfterViewInit(): void {
    // Wait for the dialog's open animation to finish (scrollIntoView-style
    // measurements taken mid-animation land in the wrong spot and then jump,
    // which reads as a delay), then wait two frames so layout has settled.
    this.dialogRef.afterOpened().subscribe(() => this.scrollToSelectedNextFrame());
  }

  pad(n: number): string {
    return n.toString().padStart(2, '0');
  }

  selectHour(hour: number): void {
    this.selectedHour = hour;
  }

  selectMinute(minute: number): void {
    this.selectedMinute = minute;
  }

  selectPeriod(period: 'AM' | 'PM'): void {
    this.selectedPeriod = period;
  }

  setNow(): void {
    const now = new Date();
    const h24 = now.getHours();
    this.selectedPeriod = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12;
    this.selectedHour = h12 === 0 ? 12 : h12;

    const interval = this.minutes.length > 1 ? this.minutes[1] - this.minutes[0] : 1;
    this.selectedMinute = (Math.round(now.getMinutes() / interval) * interval) % 60;

    this.scrollToSelectedNextFrame();
  }

  onConfirm(): void {
    const result: TimePickerDialogResult = {
      hour: this.selectedHour,
      minute: this.selectedMinute,
      period: this.selectedPeriod,
      formatted: `${this.selectedHour}:${this.pad(this.selectedMinute)} ${this.selectedPeriod}`,
    };
    this.dialogRef.close(result);
  }

  private scrollToSelectedNextFrame(): void {
    requestAnimationFrame(() => requestAnimationFrame(() => this.scrollToSelected()));
  }

  private scrollToSelected(): void {
    this.scrollColumnTo(this.hourList?.nativeElement, this.hours.indexOf(this.selectedHour));
    this.scrollColumnTo(this.minuteList?.nativeElement, this.minutes.indexOf(this.selectedMinute));
  }

  private scrollColumnTo(el: HTMLDivElement | undefined, index: number): void {
    if (!el || index < 0) return;
    const item = el.children[index] as HTMLElement | undefined;
    if (!item) return;
    // Set scrollTop directly (rather than scrollIntoView) so the container
    // lands exactly on the snap point in one step, instead of jumping close
    // and then letting the browser's own snap-correction animate the rest
    // of the way — that secondary animation is what looked like a delay.
    el.scrollTop = item.offsetTop - el.clientHeight / 2 + item.clientHeight / 2;
  }
  onHourScroll(): void {
    if (this.hourScrollFrame !== null) {
      return;
    }

    this.hourScrollFrame = requestAnimationFrame(() => {
      this.hourScrollFrame = null;

      const index = this.getCenteredItemIndex(this.hourList?.nativeElement);

      if (index >= 0 && this.hours[index] !== this.selectedHour) {
        this.selectedHour = this.hours[index];
      }
    });
  }

  onMinuteScroll(): void {
    if (this.minuteScrollFrame !== null) {
      return;
    }

    this.minuteScrollFrame = requestAnimationFrame(() => {
      this.minuteScrollFrame = null;

      const index = this.getCenteredItemIndex(this.minuteList?.nativeElement);

      if (index >= 0 && this.minutes[index] !== this.selectedMinute) {
        this.selectedMinute = this.minutes[index];
      }
    });
  }

  private getCenteredItemIndex(el: HTMLDivElement | undefined): number {
    if (!el || el.children.length === 0) {
      return -1;
    }

    const containerRect = el.getBoundingClientRect();

    const containerCenter = containerRect.top + containerRect.height / 2;

    let closestIndex = -1;
    let closestDistance = Infinity;

    Array.from(el.children).forEach((child, index) => {
      const item = child as HTMLElement;
      const itemRect = item.getBoundingClientRect();

      const itemCenter = itemRect.top + itemRect.height / 2;

      const distance = Math.abs(containerCenter - itemCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    return closestIndex;
  }
}
