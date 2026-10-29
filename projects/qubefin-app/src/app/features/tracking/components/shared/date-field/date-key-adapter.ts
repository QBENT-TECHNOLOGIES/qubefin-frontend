import { Injectable, Provider } from '@angular/core';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, MatDateFormats, NativeDateAdapter } from '@angular/material/core';

/**
 * Date adapter for the tracking module.
 *
 * Tracking models keep dates as local "yyyy-MM-dd" keys (see `toDateKey`). The stock
 * NativeDateAdapter reads those keys as UTC midnight and parses typed "27/10/2026" as
 * month/day, so this adapter:
 *  - deserialises "yyyy-MM-dd" as a local date (no time-zone drift),
 *  - parses typed dd/MM/yyyy (also dd-MM-yyyy, dd.MM.yyyy, 2-digit years) day-first,
 *  - parses "HH:mm" / "h:mm am" for the timepicker.
 */
@Injectable()
export class DateKeyAdapter extends NativeDateAdapter {
  override deserialize(value: unknown): Date | null {
    if (typeof value === 'string') {
      const key = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
      if (key) return this.build(+key[1], +key[2], +key[3]);
    }
    return super.deserialize(value);
  }

  override parse(value: unknown, parseFormat?: unknown): Date | null {
    if (typeof value === 'string') {
      const s = value.trim();
      if (!s) return null;
      const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
      if (iso) return this.build(+iso[1], +iso[2], +iso[3]);
      const dmy = /^(\d{1,2})[/.\-\s](\d{1,2})[/.\-\s](\d{2}|\d{4})$/.exec(s);
      if (dmy) {
        const year = dmy[3].length === 2 ? 2000 + +dmy[3] : +dmy[3];
        return this.build(year, +dmy[2], +dmy[1]);
      }
    }
    return super.parse(value, parseFormat);
  }

  private build(year: number, month: number, day: number): Date {
    const d = new Date(year, month - 1, day);
    // Reject roll-overs such as 31/02 -> 03/03.
    return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day ? d : this.invalid();
  }
}

/** dd/MM/yyyy in the field (same as the HRMS screens), 12-hour times. */
export const TRACKING_DATE_FORMATS: MatDateFormats = {
  parse: { dateInput: null, timeInput: null },
  display: {
    dateInput: { day: '2-digit', month: '2-digit', year: 'numeric' },
    timeInput: { hour: '2-digit', minute: '2-digit', hour12: true },
    monthYearLabel: { month: 'short', year: 'numeric' },
    dateA11yLabel: { day: 'numeric', month: 'long', year: 'numeric' },
    monthYearA11yLabel: { month: 'long', year: 'numeric' },
    timeOptionLabel: { hour: '2-digit', minute: '2-digit', hour12: true },
  },
};

/** Provide on any component that hosts a tracking date/time picker. */
export function provideTrackingDateAdapter(): Provider[] {
  return [
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' },
    { provide: MAT_DATE_FORMATS, useValue: TRACKING_DATE_FORMATS },
    { provide: DateAdapter, useClass: DateKeyAdapter },
  ];
}

/** "yyyy-MM-dd" -> local Date (null when empty/invalid). */
export function dateKeyToDate(key: string | null | undefined): Date | null {
  const m = key ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(key) : null;
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return isNaN(d.getTime()) ? null : d;
}

/** "HH:mm" -> Date today at that time (null when empty/invalid). */
export function timeKeyToDate(key: string | null | undefined): Date | null {
  const m = key ? /^(\d{1,2}):(\d{2})/.exec(key) : null;
  if (!m) return null;
  const d = new Date();
  d.setHours(+m[1], +m[2], 0, 0);
  return d;
}

/** Date -> "HH:mm". */
export function toTimeKey(d: Date): string {
  return `${`${d.getHours()}`.padStart(2, '0')}:${`${d.getMinutes()}`.padStart(2, '0')}`;
}
