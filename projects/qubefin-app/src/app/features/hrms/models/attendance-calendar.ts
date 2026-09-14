export interface CalendarDay {
  calendarDate: string;
  dayName: string;
  status: string | null;
}

export interface CalendarStatusConfig {
  label: string;
  dot: string;
  chip: string;
}

export interface AttendanceCalendarModalData {
  year?: number;
  month?: number;
}
