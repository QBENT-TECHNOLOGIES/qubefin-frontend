export interface CalendarDay {
  calendarDate: string;
  dayName: string;
  status: string | null;
  actualInTime?: string;
  actualOutTime?: string;
  description?: string;
}

export interface CalendarStatusConfig {
  label: string;
  dot: string;
  chip: string;
}

export interface AttendanceCalendarModalData {
  year?: number;
  month?: number;
  employeeId?: string;
  employeeName?: string;
}
