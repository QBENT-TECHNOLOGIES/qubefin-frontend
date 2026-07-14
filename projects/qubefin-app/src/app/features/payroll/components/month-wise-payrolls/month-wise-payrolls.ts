import { APP_ICONS_MAP } from './../../../../lucide-icons';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, inject, output, signal } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { PayrollStore } from '../../stores/payroll-store';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { PayrollService } from '../../services/payroll-service';
@Component({
  selector: 'qfin-month-wise-payrolls',
  imports: [CommonModule, CurrencyPipe, LucideDynamicIcon, MatTooltipModule, MatFormFieldModule, MatInputModule, MatSelectModule, FormsModule],
  templateUrl: './month-wise-payrolls.html',
})
export class MonthWisePayrolls {
  private readonly payrollStore = inject(PayrollStore);
  private readonly payrollService = inject(PayrollService);
  readonly iconMap = APP_ICONS_MAP;
  summaries = this.payrollStore.monthlyPayrollSummaries;
  loading = this.payrollStore.monthlyPayrollSummariesLoading;

  onViewMonth = output<{ month: number; year: number }>();

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
  onDownloadPfReport(month: number, year: number) {
    this.isDownloading.set(true);
    this.payrollService.getPfReport(month, year).subscribe({
      next: (blob: Blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `PF_Report_${month}_${year}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(downloadUrl);
        this.isDownloading.set(false);
      },
      error: (err) => {
        this.isDownloading.set(false);
      }
    });
  }
  onDownloadPTaxReport(month: number, year: number) {
    this.isDownloading.set(true);
    this.payrollService.getPTaxReport(month, year).subscribe({
      next: (blob: Blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `PTax_Report_${month}_${year}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(downloadUrl);
        this.isDownloading.set(false);
      },
      error: (err) => {
        this.isDownloading.set(false);
      }
    });
  }
  onDownloadEsiReport(month: number, year: number) {
    this.isDownloading.set(true);
    this.payrollService.getEsiReport(month, year).subscribe({
      next: (blob: Blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `ESI_Report_${month}_${year}.xlsx`;
        window.URL.revokeObjectURL(downloadUrl);
        link.click();
        this.isDownloading.set(false);
      },
      error: (err) => {
        this.isDownloading.set(false);
      }
    })
  }
}


