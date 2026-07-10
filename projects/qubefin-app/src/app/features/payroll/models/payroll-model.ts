export interface Payroll {
    id: string;
    payrollMonth: number;
    payrollYear: number;
    employeeId: string;
    employeeName?: string;
    organizationUnitId: string;
    designationId: string;
    designation?: string;
    companyId: string;
    company?: string;
    isLocked: boolean;
    finYearId: string;
    finYear?: string;
    dayCount?: number;
}
export interface IMonthlyPayrollLineItem {
  id: string;
  employeeId: string;
  employeeName?: string;
  designationId: string;
  designationTitle?: string;
  companyId: string;
  companyName?: string;
  totalEarnings: number;
  totalDeductions: number;
}

export interface IMonthlyPayrollHeader {
  organizationUnitId: string;
  organizationUnitName: string;
  totalEarnings: number;
  totalDeductions: number;
  details: IMonthlyPayrollLineItem[];
}

export interface IMonthlyPayroll {
  payrollMonth: number;
  payrollYear: number;
  payrollMonthYear: string;
  isLocked: boolean;
  headers: IMonthlyPayrollHeader[];
}