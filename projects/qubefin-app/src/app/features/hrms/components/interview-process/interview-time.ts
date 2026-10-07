import { MatDialog } from '@angular/material/dialog';
import { TimePickerDialogComponent } from 'qubefin-core';

/** "2026-09-25" -> local-midnight Date (new Date("yyyy-MM-dd") would be UTC and can shift a day). */
export function toLocalDate(value: string | null | undefined): Date | '' {
  if (!value) return '';
  const [y, m, d] = value.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Local Date -> "yyyy-MM-dd" as the API expects for DateOnly. */
export function toApiDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = typeof value === 'string' ? toLocalDate(value) : value;
  if (!date) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** "14:30:00" -> "02:30 PM", the format the time picker writes. */
export function toDisplayTime(value: string | null | undefined): string {
  if (!value) return '';
  if (/AM|PM/i.test(value)) return value;
  const [h, m] = value.split(':').map((part) => parseInt(part, 10));
  if (isNaN(h)) return '';
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${String(hour).padStart(2, '0')}:${String(m || 0).padStart(2, '0')} ${period}`;
}

/** "02:30 PM" / "14:30" -> "14:30:00", the format the API expects for TimeOnly. */
export function toApiTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const parts = value.trim().split(/\s+/);
  const [hourPart, minutePart] = parts[0].split(':');
  let hour = parseInt(hourPart, 10);
  const minute = parseInt(minutePart ?? '0', 10);
  const period = parts[1]?.toUpperCase();
  if (isNaN(hour)) return null;
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${String(minute || 0).padStart(2, '0')}:00`;
}

/** Opens the shared time picker and hands back the picked time as "hh:mm AM/PM". */
export function openTimePicker(dialog: MatDialog, title: string, currentTime: string, callback: (time: string) => void) {
  let currentHour = 12;
  let currentMinute = 0;
  let currentPeriod: 'AM' | 'PM' = 'AM';

  if (currentTime) {
    const parts = currentTime.split(' ');
    const timeParts = parts[0].split(':');
    currentHour = parseInt(timeParts[0], 10) || 12;
    currentMinute = parseInt(timeParts[1], 10) || 0;
    if (parts[1]) {
      currentPeriod = parts[1] as 'AM' | 'PM';
    } else {
      currentPeriod = currentHour >= 12 ? 'PM' : 'AM';
      currentHour = currentHour % 12 || 12;
    }
  }

  const dialogRef = dialog.open(TimePickerDialogComponent, {
    width: '340px',
    maxWidth: '95vw',
    panelClass: 'custom-time-picker-dialog',
    data: { title, currentHour, currentMinute, currentPeriod },
  });

  dialogRef.afterClosed().subscribe((result) => {
    if (result && result.formatted) {
      callback(result.formatted);
    }
  });
}
