export interface PayslipListModel {
  payslipId: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  organizationUnitName: string;
  salaryGrade: string;
  payrollMonth: number;
  payrollYear: number;
  totalEarning: number;
  totalDeduction: number;
  netPay: number;
}
