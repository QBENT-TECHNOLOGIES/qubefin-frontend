import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input, model, output } from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { provideTrackingDateAdapter, timeKeyToDate, toTimeKey } from './date-key-adapter';

/**
 * Material time picker for the tracking module. The value is an "HH:mm" key ('' when empty).
 *
 *   <qfin-trk-time-field label="Duty starts" [value]="d.workingHoursStart" (valueChange)="set('workingHoursStart', $event)" />
 *   <qfin-trk-time-field compact ariaLabel="Allocation time" [value]="d.autoAllocationTime" (valueChange)="..." />
 */
@Component({
  selector: 'qfin-trk-time-field',
  imports: [MatFormFieldModule, MatInputModule, MatTimepickerModule],
  providers: [provideTrackingDateAdapter()],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'compact() ? "inline-flex" : "block"' },
  template: `
    @if (compact()) {
      <div class="trk-date-compact" [class.is-disabled]="disabled()">
        <input #inp [matTimepicker]="picker" [value]="timeValue()" (valueChange)="onTimeChange($event)" [disabled]="disabled()"
          placeholder="--:--" [attr.aria-label]="ariaLabel() || label() || 'Time'" (blur)="onBlur(inp)" />
        <mat-timepicker-toggle [for]="picker" class="trk-time-compact-toggle" />
        <mat-timepicker #picker [interval]="interval()" />
      </div>
    } @else {
      <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-full">
        @if (label()) { <mat-label>{{ label() }}</mat-label> }
        <input #inp matInput [matTimepicker]="picker" [value]="timeValue()" (valueChange)="onTimeChange($event)"
          [disabled]="disabled()" [required]="required()" placeholder="--:--" autocomplete="off"
          [attr.aria-label]="ariaLabel() || null" (blur)="onBlur(inp)" />
        <mat-timepicker-toggle matIconSuffix [for]="picker" />
        <mat-timepicker #picker [interval]="interval()" />
      </mat-form-field>
    }
  `,
})
export class TrkTimeField implements FormValueControl<string> {
  /** "HH:mm", or '' when empty. */
  readonly value = model<string>('');
  readonly label = input<string>('');
  readonly ariaLabel = input<string | null>(null);
  /** Gap between options in the dropdown, e.g. '15m', '30m'. Any time can still be typed. */
  readonly interval = input<string>('15m');
  readonly compact = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly touch = output<void>();

  /** Last Date the picker emitted; handed back unchanged so the input isn't reformatted mid-typing. */
  private lastEmitted: Date | null = null;

  protected readonly timeValue = computed(() => {
    const key = this.value();
    return this.lastEmitted && toTimeKey(this.lastEmitted) === key ? this.lastEmitted : timeKeyToDate(key);
  });

  protected onTimeChange(d: Date | null) {
    // Partial text ("9:", "9:3") parses to null while typing; only commit real times here.
    if (!d || isNaN(d.getTime())) return;
    this.lastEmitted = d;
    const key = toTimeKey(d);
    if (key !== this.value()) this.value.set(key);
  }

  protected onBlur(input: HTMLInputElement) {
    if (!input.value.trim() && this.value()) {
      this.lastEmitted = null;
      this.value.set('');
    }
    this.touch.emit();
  }
}
