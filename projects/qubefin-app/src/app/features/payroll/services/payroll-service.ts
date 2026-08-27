import { Payroll, PayslipRptParam } from './../models/payroll-model';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';

@Injectable({
  providedIn: 'root',
})
export class PayrollService {
  httpClient = inject(HttpClient);
  getAll() {
    return this.httpClient.get(`${ApiPaths.PAYROLL}/payrolls`);
  }
  getById(id: string) {
    return this.httpClient.get(`${ApiPaths.PAYROLL}/payroll/${id}`);
  }
  getMontlyPayrolls(month: number, year: number) {
    return this.httpClient.get(`${ApiPaths.PAYROLL}/payrolls/${month}/${year}`);
  }
  getMonthWisePayroll() {
    return this.httpClient.get(`${ApiPaths.PAYROLL}/month-wise-payroll`);
  }
  lockPayroll(year: number, month: number) {
    return this.httpClient.put(`${ApiPaths.PAYROLL}/lock-payrolls/${year}/${month}`, null);
  }
  getPfReport(month: number, year: number, companyId: string) {
    return this.httpClient.get(
      `${ApiPaths.PAYROLL}/generate-pf-report/${month}/${year}/${companyId}`,
      {
        responseType: 'blob',
      },
    );
  }
  getPTaxReport(month: number, year: number, companyId: string) {
    return this.httpClient.get(
      `${ApiPaths.PAYROLL}/generate-ptax-report/${month}/${year}/${companyId}`,
      {
        responseType: 'blob',
      },
    );
  }
  getEsiReport(month: number, year: number, companyId: string) {
    return this.httpClient.get(
      `${ApiPaths.PAYROLL}/generate-esi-report/${month}/${year}/${companyId}`,
      {
        responseType: 'blob',
      },
    );
  }
  getSalaryDisbursementReport(month: number, year: number, companyId: string) {
    return this.httpClient.get(
      `${ApiPaths.PAYROLL}/generate-salary-disbursement-report/${month}/${year}/${companyId}`,
      {
        responseType: 'blob',
      },
    );
  }
  createPayroll(companyId: string) {
    return this.httpClient.post(`${ApiPaths.PAYROLL}/create?companyId=${companyId}`, null);
  }
  updateEmployeePayroll(command: any) {
    return this.httpClient.put(`${ApiPaths.PAYROLL}/update-employee-payroll`, command);
  }
  getPayslip(model: PayslipRptParam) {
    return this.httpClient.post(`${ApiPaths.PAYROLL}/payslip`, model, { responseType: 'blob' });
  }
  getPayslipById(payslipId: string) {
    return this.httpClient.get(`${ApiPaths.PAYROLL}/reports/payslip/${payslipId}`, {
      responseType: 'blob',
    });
  }
  getSalaryGrade() {
    return this.httpClient.get(`${ApiPaths.PAYROLL}/salary-grade`);
  }
}
