import { APP_ICONS_MAP } from './../../../../lucide-icons';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, inject, output } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { PayrollStore } from '../../stores/payroll-store';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'qfin-month-wise-payrolls',
  imports: [CommonModule, CurrencyPipe, LucideDynamicIcon, MatTooltipModule],
  templateUrl: './month-wise-payrolls.html',
})
export class MonthWisePayrolls {
  private readonly payrollStore = inject(PayrollStore);
  readonly icons = APP_ICONS_MAP;
  summaries = this.payrollStore.monthlyPayrollSummaries;
  loading = this.payrollStore.monthlyPayrollSummariesLoading;
 
  onViewMonth = output<{ month: number; year: number }>();
 
  onView(month: number, year: number) {
    this.onViewMonth.emit({ month, year });
  }
 
  onLockMonth(month: number, year: number) {
  }
}
