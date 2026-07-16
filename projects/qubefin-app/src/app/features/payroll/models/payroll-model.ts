export interface Payroll {
  id: string;
  payrollMonth: number;
  payrollYear: number;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  organizationUnitId: string;
  organizationUnitName: string;
  designationId: string;
  designation?: string;
  designationTitle?: string;
  companyId: string;
  company?: string;
  isLocked: boolean;
  finYearId: string;
  finYear?: string;
  dayCount?: number;
  salaryGradeId?: string;
  salaryGradeName?: string;
  createdOn?: Date;
  createdBy?: string;
  salaryStructureId?: string;
  components?: PayrollComponent[];
  earningHeads?: PayrollComponent[];
  deductionHeads?: PayrollComponent[];
}
export interface IMonthlyPayrollLineItem {
  id: string;
  employeeId: string;
  employeeName: string;
  designationId: string;
  designationTitle?: string;
  companyId: string;
  companyName?: string;
  totalEarnings: number;
  totalDeductions: number;
}

export interface IMonthlyPayrollHeader {
  organizationUnitId: string;
  codeVal: number;
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
export interface IMonthWisePayroll {
  payrollMonth: number;
  payrollYear: number;
  payrollMonthYear: string;
  employeeCount: number;
  earnings: number;
  deductions: number;
  netPay: number;
  locked: boolean;
}
export interface PayrollComponent {
  id: string;
  salaryComponentId: string;
  salaryComponentName?: string;
  categoryName?: string;
  percentage: number;
  amount: number;
}
export interface UpdatePayrollCommand {
  payrollId: string;
  earningHeads: { salaryComponentId: string; amount: number }[];
  deductionHeads: { salaryComponentId: string; amount: number }[];
}
interface IPayslipReportParam {
  employeeId: string;
  payslipMonth: number;
  payslipYear: number;
}
export class PayslipRptParam implements IPayslipReportParam {
  public employeeId: string;
  public payslipMonth: number;
  public payslipYear: number;

  constructor(payslipRptParam?: IPayslipReportParam) {
    this.employeeId = payslipRptParam && payslipRptParam.employeeId || '00000000-0000-0000-0000-000000000000';
    this.payslipMonth = payslipRptParam && payslipRptParam?.payslipMonth || 0;
    this.payslipYear = payslipRptParam && payslipRptParam?.payslipYear || 0;
  }
}