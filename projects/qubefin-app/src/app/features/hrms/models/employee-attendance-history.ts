export interface IEmployeeAttendanceHistory {
  id: string;
  organizationUnit: string;
  employeeName: string;
  employeeCode: string;
  organizationName: string;
  attendanceDate: string;
  actualInTime: string | null;
  actualOutTime: string | null;
  workingHours: string | null;
  status: string | null;
  isRegularized: string | null;
}
