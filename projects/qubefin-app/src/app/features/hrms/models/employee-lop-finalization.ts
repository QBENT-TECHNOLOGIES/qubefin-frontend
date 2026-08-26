export interface SearchParam {
  searchText?: string | null;
  sortOn: string;
  sortDirection: string;
  pageIndex: number;
  pageSize: number;
}

export interface MoralizationSearch extends SearchParam {
  year: number;
  month: number;
  companyId?: string | null;
  searchOrganizationUnitId?: string | null;
  employeeId?: string | null;
  status?: number | null;
}

export interface EmployeeWiseCalculationResponse {
  id: string;
  employeeId: string;
  employeeCode?: string | null;
  employeeName?: string | null;
  organizationUnitId: string;
  organizationUnitName?: string | null;
  companyName?: string | null;
  holiDays: number;
  workingDays: number;
  leaveDays: number;
  attendanceDays: number;
  absentDays: number;
  attendanceIrregularDays: number;
  irregularLopDays: number;
  isLocked: boolean;
  remarks?: string | null;
}

export interface EmployeeLosDetails {
  id: string;
  employeeLopId: string;
  absentDate: string | Date;
  payrollStatus?: string | null;
}
