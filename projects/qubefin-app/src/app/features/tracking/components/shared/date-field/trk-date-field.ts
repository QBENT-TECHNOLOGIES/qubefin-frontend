import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input, model, output } from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import { MatDatepickerInputEvent, MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LucideDynamicIcon } from '@lucide/angular';
import { toDateKey } from '../../../utils/geo-utils';
import { dateKeyToDate, provideTrackingDateAdapter } from './date-key-adapter';

/**
 * Material date picker for the tracking module. The value is a "yyyy-MM-dd" key ('' when empty),
 * so it drops straight into the existing stores and models.
 *
 *   <qfin-trk-date-field label="Due from" clearable [(value)]="from" [maxDate]="to()" />
 *   <qfin-trk-date-field label="Complete by" [formField]="jobForm.completeBy" [minDate]="today" />
 *   <qfin-trk-date-field compact [value]="day()" (valueChange)="setDay($event)" [maxDate]="today()" />
 */
@Component({
  selector: 'qfin-trk-date-field',
  imports: [MatFormFieldModule, MatInputModule, MatDatepickerModule, LucideDynamicIcon],
  providers: [provideTrackingDateAdapter()],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'compact() ? "inline-flex" : "block"' },
  template: `
    @if (compact()) {
      <div class="trk-date-compact" [class.is-disabled]="disabled()">
        <input readonly [matDatepicker]="picker" [value]="dateValue()" [min]="minDate() || null" [max]="maxDate() || null"
          [disabled]="disabled()" [placeholder]="placeholder()" [attr.aria-label]="ariaLabel() || label() || 'Date'"
          (dateChange)="onDateChange($event)" (click)="picker.open()" (keydown.enter)="picker.open()" (blur)="touch.emit()" />
        <button type="button" class="trk-date-compact-btn" [disabled]="disabled()" (click)="picker.open()" aria-label="Open calendar">
          <svg lucideIcon="calendar-days" class="w-4 h-4"></svg>
        </button>
        <mat-datepicker #picker />
      </div>
    } @else {
      <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-full">
        @if (label()) { <mat-label>{{ label() }}</mat-label> }
        @if (icon()) {
          <div class="w-12 flex justify-center" matPrefix><svg [lucideIcon]="icon()!" class="w-5 h-5"></svg></div>
        }
        <input matInput [matDatepicker]="picker" [value]="dateValue()" [min]="minDate() || null" [max]="maxDate() || null"
          [disabled]="disabled()" [required]="required()" [placeholder]="placeholder()" autocomplete="off"
          [attr.aria-label]="ariaLabel() || null" (dateChange)="onDateChange($event)" (blur)="touch.emit()" />
        <div matIconSuffix class="flex items-center pr-1">
          @if (clearable() && value() && !disabled()) {
            <button type="button" class="trk-date-clear" (click)="clear()" aria-label="Clear date">
              <svg lucideIcon="x" class="w-4 h-4"></svg>
            </button>
          }
          <mat-datepicker-toggle [for]="picker" />
        </div>
        <mat-datepicker #picker />
      </mat-form-field>
    }
  `,
})
export class TrkDateField implements FormValueControl<string> {
  /** "yyyy-MM-dd", or '' when nothing is picked. */
  readonly value = model<string>('');
  readonly label = input<string>('');
  readonly placeholder = input<string>('dd/mm/yyyy');
  readonly icon = input<string | null>(null);
  readonly ariaLabel = input<string | null>(null);
  /** Earliest / latest selectable day ("yyyy-MM-dd"). */
  readonly minDate = input<string | null | undefined>(null);
  readonly maxDate = input<string | null | undefined>(null);
  readonly clearable = input(false, { transform: booleanAttribute });
  /** Small inline button-style picker for toolbars (Live Tracking, Tracking History). */
  readonly compact = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly touch = output<void>();

  protected readonly dateValue = computed(() => dateKeyToDate(this.value()));

  protected onDateChange(e: MatDatepickerInputEvent<Date>) {
    const d = e.value;
    const key = d && !isNaN(d.getTime()) ? toDateKey(d) : '';
    if (key !== this.value()) this.value.set(key);
  }

  protected clear() {
    this.value.set('');
    this.touch.emit();
  }
}
