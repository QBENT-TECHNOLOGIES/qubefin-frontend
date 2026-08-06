export interface IAttendanceHistory {
  id: string;
  attendanceDate: string;
  actualInTime: string | null;
  actualOutTime: string | null;
  workingHours: string | null;
  status: string | null;
}
