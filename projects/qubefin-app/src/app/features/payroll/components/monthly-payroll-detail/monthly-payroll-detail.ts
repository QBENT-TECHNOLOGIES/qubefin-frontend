import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, effect, inject, input, signal } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { PayrollStore } from '../../stores/payroll-store';
import { MatExpansionModule } from '@angular/material/expansion';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'qfin-monthly-payroll-detail',
  imports: [CommonModule, CurrencyPipe, MatExpansionModule, LucideDynamicIcon, MatTooltipModule],
  templateUrl: './monthly-payroll-detail.html',
})
export class MonthlyPayrollDetail {
  private readonly payrollStore = inject(PayrollStore);

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
    this.payrollStore.setPayrollId(payrollId);
  }

  netPay(earnings: number, deductions: number): number {
    return earnings - deductions;
  }
}
