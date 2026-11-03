import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { MatDatepickerInputEvent, MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { LucideDynamicIcon } from '@lucide/angular';
import { toDateKey } from '../../../utils/geo-utils';
import { dateKeyToDate, provideTrackingDateAdapter } from './date-key-adapter';

export interface DateKeyRange {
  /** "yyyy-MM-dd", or '' when open-ended. */
  from: string;
  to: string;
}

/**
 * One field for a from / to filter (replaces two date fields side by side). Values are "yyyy-MM-dd" keys.
 * `rangeChange` fires once per pick (after the end day, or when the calendar closes with only a start),
 * and when a day is typed, so a list does not reload twice.
 *
 *   <qfin-trk-date-range-field label="Due between" [from]="store.dueFrom()" [to]="store.dueTo()" (rangeChange)="setDue($event)" />
 */
@Component({
  selector: 'qfin-trk-date-range-field',
  imports: [MatFormFieldModule, MatDatepickerModule, LucideDynamicIcon],
  providers: [provideTrackingDateAdapter()],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-full">
      @if (label()) { <mat-label>{{ label() }}</mat-label> }
      <mat-date-range-input [rangePicker]="picker" [min]="minDateValue()" [max]="maxDateValue()">
        <input matStartDate placeholder="From" autocomplete="off" [value]="fromDate()" (dateChange)="onStart($event)" />
        <input matEndDate placeholder="To" autocomplete="off" [value]="toDate()" (dateChange)="onEnd($event)" />
      </mat-date-range-input>
      <div matIconSuffix class="flex items-center pr-1">
        @if (from() || to()) {
          <button type="button" class="trk-date-clear" (click)="clear()" aria-label="Clear dates">
            <svg lucideIcon="x" class="w-4 h-4"></svg>
          </button>
        }
        <mat-datepicker-toggle [for]="picker" />
      </div>
      <mat-date-range-picker #picker (opened)="pickerOpen.set(true)" (closed)="onClosed()" />
    </mat-form-field>
  `,
})
export class TrkDateRangeField {
  readonly from = input<string | null | undefined>('');
  readonly to = input<string | null | undefined>('');
  readonly label = input<string>('');
  /** Earliest / latest selectable day ("yyyy-MM-dd"). */
  readonly minDate = input<string | null | undefined>(null);
  readonly maxDate = input<string | null | undefined>(null);
  readonly rangeChange = output<DateKeyRange>();

  protected readonly pickerOpen = signal(false);
  private draft: DateKeyRange = { from: '', to: '' };

  protected readonly fromDate = computed(() => dateKeyToDate(this.from()));
  protected readonly toDate = computed(() => dateKeyToDate(this.to()));
  protected readonly minDateValue = computed(() => dateKeyToDate(this.minDate()));
  protected readonly maxDateValue = computed(() => dateKeyToDate(this.maxDate()));

  protected onStart(e: MatDatepickerInputEvent<Date>) {
    const from = this.key(e.value);
    // In the calendar a new start begins a new range: wait for the end day. A typed start applies at once.
    if (this.pickerOpen()) this.draft = { from, to: '' };
    else this.emit({ from, to: this.to() ?? '' });
  }

  protected onEnd(e: MatDatepickerInputEvent<Date>) {
    const to = this.key(e.value);
    if (this.pickerOpen()) {
      this.draft = { ...this.draft, to };
      if (to) this.emit(this.draft); // the calendar clears the end when a new start is picked; ignore that
    } else this.emit({ from: this.from() ?? '', to });
  }

  protected onClosed() {
    this.pickerOpen.set(false);
    // Closed after picking only a start day: filter from that day on.
    if (this.draft.from && !this.draft.to) this.emit({ from: this.draft.from, to: '' });
    this.draft = { from: '', to: '' };
  }

  protected clear() {
    this.emit({ from: '', to: '' });
  }

  private emit(r: DateKeyRange) {
    if (r.from === (this.from() ?? '') && r.to === (this.to() ?? '')) return;
    this.rangeChange.emit({ ...r });
  }

  private key(d: Date | null): string {
    return d && !isNaN(d.getTime()) ? toDateKey(d) : '';
  }
}
