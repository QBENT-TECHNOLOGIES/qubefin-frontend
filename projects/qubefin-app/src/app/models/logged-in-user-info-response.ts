export interface LoggedInUserInfoResponse {
  id: string;
  userName: string;
  employeeId: string;
  employee: string;
  branch: string;
  latitude: number;
  longitude: number;
  attendanceInTime: string;
  attendanceOutTime: string;
  checkRadiusInMeter: number;
  designation: string;
  notificationCount?: number;
  companyLogoUrl?: string;
}
