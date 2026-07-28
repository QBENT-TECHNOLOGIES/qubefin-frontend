export interface IAttendanceHistory {
  id: string;
  attendanceDate: string;
  actualInTime: string;
  actualOutTime: string | null;
  workingHours: string;
  status: string;
}
