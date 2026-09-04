import { APP_ICONS_MAP } from './../../../../lucide-icons';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, inject, output, signal, input, computed } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { PayrollStore } from '../../stores/payroll-store';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { MatMenuModule } from '@angular/material/menu';
import { PayrollService } from '../../services/payroll-service';
import { MatTableModule } from '@angular/material/table';
@Component({
  selector: 'qfin-month-wise-payrolls',
  imports: [
    CommonModule,
    MatMenuModule,
    CurrencyPipe,
    LucideDynamicIcon,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    FormsModule,
    MatTableModule,
  ],
  templateUrl: './month-wise-payrolls.html',
})
export class MonthWisePayrolls {
  private readonly payrollStore = inject(PayrollStore);
  private readonly payrollService = inject(PayrollService);
  readonly iconMap = APP_ICONS_MAP;
  summaries = this.payrollStore.monthlyPayrollSummaries;
  loading = this.payrollStore.monthlyPayrollSummariesLoading;

  isCollapsed = input<boolean>(false);
  selectedMonth = input<number | null>(null);
  selectedYear = input<number | null>(null);

  onViewMonth = output<{ month: number; year: number }>();
  displayedColumns = computed(() => {
    if (this.isCollapsed()) {
      return ['monthYear', 'netPay', 'actions'];
    }
    return [
      'index',
      'monthYear',
      'companyName',
      'employees',
      'earnings',
      'deductions',
      'netPay',
      'ctc',
      'status',
      'reports',
      'actions',
    ];
  });
  onView(month: number, year: number) {
    this.onViewMonth.emit({ month, year });
  }

  onLockMonth(month: number, year: number) {
    const isConfirmed = confirm(`Are you sure you want to lock the payroll for ${month}/${year}?`);
    if (isConfirmed) {
      this.payrollStore.lockMonthlyPayroll(month, year);
    }
  }
  readonly isDownloading = signal<boolean>(false);
  onDownloadPfReport(month: number, year: number, companyId: string, companyName: string) {
    this.isDownloading.set(true);
    this.payrollService.getPfReport(month, year, companyId).subscribe({
      next: (blob: Blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `PF_Report_${month}_${year}_${companyName}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(downloadUrl);
        this.isDownloading.set(false);
      },
      error: (err) => {
        this.isDownloading.set(false);
      },
    });
  }
  onDownloadPTaxReport(month: number, year: number, companyId: string, companyName: string) {
    this.isDownloading.set(true);
    this.payrollService.getPTaxReport(month, year, companyId).subscribe({
      next: (blob: Blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `PTax_Report_${month}_${year}_${companyName}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(downloadUrl);
        this.isDownloading.set(false);
      },
      error: (err) => {
        this.isDownloading.set(false);
      },
    });
  }
  onDownloadEsiReport(month: number, year: number, companyId: string, companyName: string) {
    this.isDownloading.set(true);
    this.payrollService.getEsiReport(month, year, companyId).subscribe({
      next: (blob: Blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `ESI_Report_${month}_${year}_${companyName}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(downloadUrl);
        this.isDownloading.set(false);
      },
      error: (err) => {
        this.isDownloading.set(false);
      },
    });
  }
  onDownloadSalaryDisbursementReport(
    month: number,
    year: number,
    companyId: string,
    companyName: string,
  ) {
    this.isDownloading.set(true);
    this.payrollService.getSalaryDisbursementReport(month, year, companyId).subscribe({
      next: (blob: Blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `salary_Report_${month}_${year}_${companyName}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(downloadUrl);
        this.isDownloading.set(false);
      },
      error: (err) => {
        this.isDownloading.set(false);
      },
    });
  }
  onDownloadEmployeeSalaryRegisterReport(
    month: number,
    year: number,
    companyId: string,
    companyName: string,
  ) {
    this.isDownloading.set(true);
    this.payrollService.getEmployeeSalaryRegisterReport(month, year, companyId).subscribe({
      next: (blob: Blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `employee_salary_register_Report_${month}_${year}_${companyName}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(downloadUrl);
        this.isDownloading.set(false);
      },
      error: (err) => {
        this.isDownloading.set(false);
      },
    });
  }
}
