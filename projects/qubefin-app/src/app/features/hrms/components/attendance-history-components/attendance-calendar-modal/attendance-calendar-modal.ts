import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { LucideDynamicIcon } from '@lucide/angular';
import { AttendanceHistoryStore } from '../../../stores/attendance-history-store';
import {
  AttendanceCalendarModalData,
  CalendarDay,
  CalendarStatusConfig,
} from '../../../models/attendance-calendar';

@Component({
  selector: 'qfin-attendance-calendar-modal',
  imports: [CommonModule, LucideDynamicIcon],
  templateUrl: './attendance-calendar-modal.html',
  styles: ``,
})
export class AttendanceCalendarModal {
  private readonly dialogRef = inject(MatDialogRef<AttendanceCalendarModal>);

  readonly data = inject<AttendanceCalendarModalData>(MAT_DIALOG_DATA);

  // Inject the Store instead of the Service
  private readonly store = inject(AttendanceHistoryStore);

  // Directly bind to the Store's computed signals for data and loading state
  readonly days = this.store.calendarDays;
  readonly loading = this.store.isCalendarLoading;

  readonly selectedDate = signal(
    new Date(
      this.data?.year ?? new Date().getFullYear(),
      (this.data?.month ?? new Date().getMonth() + 1) - 1,
      1,
    ),
  );

  readonly statusConfig: Record<string, CalendarStatusConfig> = {
    P: {
      label: 'Present',
      dot: 'bg-emerald-500',
      chip: 'bg-emerald-50 text-emerald-700',
    },
    A: {
      label: 'Absent',
      dot: 'bg-red-500',
      chip: 'bg-red-50 text-red-600',
    },
    L: {
      label: 'Late',
      dot: 'bg-amber-500',
      chip: 'bg-amber-50 text-amber-700',
    },
    R: {
      label: 'Regularized',
      dot: 'bg-teal-500',
      chip: 'bg-teal-50 text-teal-700',
    },
    WO: {
      label: 'Week Off',
      dot: 'bg-blue-500',
      chip: 'bg-blue-50 text-blue-600',
    },
    H: {
      label: 'Holiday',
      dot: 'bg-violet-500',
      chip: 'bg-violet-50 text-violet-600',
    },
  };

  readonly monthName = computed(() =>
    this.selectedDate().toLocaleString('en-US', {
      month: 'long',
    }),
  );

  readonly year = computed(() => this.selectedDate().getFullYear());

  readonly shortRange = computed(() => {
    const date = this.selectedDate();

    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const month = date.toLocaleString('en-US', {
      month: 'short',
    });

    return `1 – ${lastDay.getDate()} ${month}`;
  });

  readonly counts = computed(() => {
    const result: Record<string, number> = {};

    Object.keys(this.statusConfig).forEach((key) => {
      result[key] = 0;
    });

    this.days().forEach((day) => {
      if (day.status && result[day.status] !== undefined) {
        result[day.status]++;
      }
    });

    return result;
  });

  readonly calendarCells = computed(() => {
    const date = this.selectedDate();

    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);

    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const cells: (CalendarDay | null)[] = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      cells.push(null);
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const calendarDay = this.days().find((item) => {
        const d = new Date(item.calendarDate);
        return d.getDate() === day;
      });

      cells.push(calendarDay ?? null);
    }

    return cells;
  });

  constructor() {
    this.updateStoreDate();
  }

  private updateStoreDate(): void {
    const date = this.selectedDate();
    this.store.setCalendarDate(date.getFullYear(), date.getMonth() + 1);
  }

  previousMonth(): void {
    const current = this.selectedDate();

    this.selectedDate.set(new Date(current.getFullYear(), current.getMonth() - 1, 1));

    this.updateStoreDate();
  }

  nextMonth(): void {
    const current = this.selectedDate();

    this.selectedDate.set(new Date(current.getFullYear(), current.getMonth() + 1, 1));

    this.updateStoreDate();
  }

  close(): void {
    this.dialogRef.close();
  }

  getStatusConfig(status: string | null) {
    if (!status) {
      return null;
    }

    return this.statusConfig[status] ?? null;
  }

  isToday(calendarDate: string): boolean {
    const today = new Date();
    const date = new Date(calendarDate);

    return (
      today.getFullYear() === date.getFullYear() &&
      today.getMonth() === date.getMonth() &&
      today.getDate() === date.getDate()
    );
  }
}
