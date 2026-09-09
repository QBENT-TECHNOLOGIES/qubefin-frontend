import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { ApiPaths } from 'qubefin-core';

@Service()
export class ReportService {
  httpClient = inject(HttpClient);
  getPfReport(month: number, year: number, companyId: string) {
    return this.httpClient.get(
      `${ApiPaths.REPORT}/generate-pf-report/${month}/${year}/${companyId}`,
      {
        responseType: 'blob',
      },
    );
  }
  getPTaxReport(month: number, year: number, companyId: string) {
    return this.httpClient.get(
      `${ApiPaths.REPORT}/generate-ptax-report/${month}/${year}/${companyId}`,
      {
        responseType: 'blob',
      },
    );
  }
  getEsiReport(month: number, year: number, companyId: string) {
    return this.httpClient.get(
      `${ApiPaths.REPORT}/generate-esi-report/${month}/${year}/${companyId}`,
      {
        responseType: 'blob',
      },
    );
  }
  getSalaryDisbursementReport(month: number, year: number, companyId: string) {
    return this.httpClient.get(
      `${ApiPaths.REPORT}/generate-salary-disbursement-report/${month}/${year}/${companyId}`,
      {
        responseType: 'blob',
      },
    );
  }
  getEmployeeSalaryRegisterReport(month: number, year: number, companyId: string) {
    return this.httpClient.get(
      `${ApiPaths.REPORT}/generate-salary-register-report/${month}/${year}/${companyId}`,
      {
        responseType: 'blob',
      },
    );
  }
  getPayslipById(payslipId: string) {
    return this.httpClient.get(`${ApiPaths.REPORT}/payslip/${payslipId}`, {
      responseType: 'blob',
    });
  }
  exportAttendanceHistory(param: any) {
    return this.httpClient.post(`${ApiPaths.REPORT}/generate-attendance-history-report`, param, {
      responseType: 'blob',
    });
  }
}
