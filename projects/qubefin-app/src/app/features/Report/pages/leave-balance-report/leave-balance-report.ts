import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { LucideDynamicIcon } from '@lucide/angular';
import { AlertService, months } from 'qubefin-core';
import { CompanyStore } from '../../../global/stores/company-store';
import { ReportService } from '../../../Report/Service/report-service';

@Component({
  selector: 'qfin-leave-balance-report',
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatSelectModule, LucideDynamicIcon],
  templateUrl: './leave-balance-report.html',
  styles: ``,
})
export class LeaveBalanceReport {
  readonly companyStore = inject(CompanyStore);
  private readonly reportService = inject(ReportService);
  private readonly alertService = inject(AlertService);

  private readonly today = new Date();

  readonly months = months;

  readonly years: number[] = Array.from({ length: 5 }, (_, i) => this.today.getFullYear() - i);

  readonly selectedYear = signal<number>(this.today.getFullYear());
  readonly selectedMonth = signal<number>(this.today.getMonth() + 1);
  readonly selectedCompanyId = signal<string | null>(null);

  readonly isDownloading = signal<boolean>(false);

  onGenerate() {
    const companyId = this.selectedCompanyId();

    if (!companyId) {
      this.alertService.warning('Validation Error', 'Please select a company.');
      return;
    }

    const year = this.selectedYear();
    const month = this.selectedMonth();
    const companyName =
      this.companyStore.companies().find((c: any) => c.id === companyId)?.name ?? 'Company';

    this.isDownloading.set(true);

    this.reportService.generateEmployeeLeaveBalanceReport(year, month, companyId).subscribe({
      next: (blob: Blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `Employee_Leave_Balance_Report_${month}_${year}_${companyName}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(downloadUrl);
        this.isDownloading.set(false);
      },
      error: () => {
        this.isDownloading.set(false);
      },
    });
  }
}
