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