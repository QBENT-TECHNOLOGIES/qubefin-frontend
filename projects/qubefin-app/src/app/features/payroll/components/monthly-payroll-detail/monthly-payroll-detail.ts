import { PayrollService } from './../../services/payroll-service';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, effect, inject, input, signal } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { PayrollStore } from '../../stores/payroll-store';
import { MatExpansionModule } from '@angular/material/expansion';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { PayrollEditModal } from '../payroll-edit-modal/payroll-edit-modal';
import { PayslipRptParam } from '../../models/payroll-model';

@Component({
  selector: 'qfin-monthly-payroll-detail',
  imports: [CommonModule, CurrencyPipe, MatExpansionModule, LucideDynamicIcon, MatTooltipModule],
  templateUrl: './monthly-payroll-detail.html',
})
export class MonthlyPayrollDetail {
  private readonly payrollStore = inject(PayrollStore);
  private readonly dialog = inject(MatDialog);
  private readonly PayrollService = inject(PayrollService);
  month = input.required<number>();
  year = input.required<number>();

  monthlyPayroll = this.payrollStore.monthlyPayroll;
  loading = this.payrollStore.monthlyPayrollLoading;

  protected readonly expandedOrgUnitId = signal<string | null>(null);
  readonly icons = APP_ICONS_MAP;
  constructor() {
    effect(() => {
      this.payrollStore.setMonthlyPayrollParams(this.month(), this.year());
    });
    effect(() => {
      const payroll = this.monthlyPayroll();
      if (!payroll || !payroll.headers.length) return;

      const headOffice = payroll.headers.find(
        h => h.organizationUnitName.trim().toLowerCase() === 'headOffice'
      );
      this.expandedOrgUnitId.set(headOffice?.organizationUnitId ?? payroll.headers[0].organizationUnitId);
    });
  }

  togglePanel(orgUnitId: string, expanded: boolean) {
    this.expandedOrgUnitId.set(expanded ? orgUnitId : null);
  }
  onViewEmployeePayroll(payrollId: string) {
    this.dialog.open(PayrollEditModal, {
      data: { id: payrollId },
      // width: '1000px',
      maxWidth: '95vw',
      panelClass: 'glass-modal'
    });
  }

  netPay(earnings: number, deductions: number): number {
    return earnings - deductions;
  }

  getInitials(name: string | undefined | null): string {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  downloadPayslip(employeeId: string, empName: string) {
    let param = new PayslipRptParam();
    param.employeeId = employeeId;
    param.payslipMonth = this.month();
    param.payslipYear = this.year();
    this.PayrollService.getPayslip(param).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${empName}-Payslip of ${this.month()}-${this.year()}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    });
  }
}
