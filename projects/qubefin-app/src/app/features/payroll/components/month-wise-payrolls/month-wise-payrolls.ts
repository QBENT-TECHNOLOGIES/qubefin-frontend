import { APP_ICONS_MAP } from './../../../../lucide-icons';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, inject, output } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { PayrollStore } from '../../stores/payroll-store';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'qfin-month-wise-payrolls',
  imports: [CommonModule, CurrencyPipe, LucideDynamicIcon, MatTooltipModule, MatFormFieldModule, MatInputModule, MatSelectModule, FormsModule],
  templateUrl: './month-wise-payrolls.html',
})
export class MonthWisePayrolls {
  private readonly payrollStore = inject(PayrollStore);
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
}
