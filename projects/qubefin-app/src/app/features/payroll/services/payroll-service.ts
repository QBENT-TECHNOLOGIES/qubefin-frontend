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
  getPfReport(month: number, year: number) {
    return this.httpClient.get(`${ApiPaths.PAYROLL}/pf-report/${month}/${year}`, {
      responseType: 'blob',
    });
  }
  getPTaxReport(month: number, year: number) {
    return this.httpClient.get(`${ApiPaths.PAYROLL}/ptax-report/${month}/${year}`, {
      responseType: 'blob',
    });
  }
  getEsiReport(month: number, year: number) {
    return this.httpClient.get(`${ApiPaths.PAYROLL}/esi-report/${month}/${year}`, {
      responseType: 'blob',
    });
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
  getSalaryGrade() {
    return this.httpClient.get(`${ApiPaths.PAYROLL}/salary-grade`);
  }
}
