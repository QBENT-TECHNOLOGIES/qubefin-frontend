import { Component, signal } from '@angular/core';
import { MonthlyPayrollDetail } from '../../components/monthly-payroll-detail/monthly-payroll-detail';
import { LucideArrowLeft } from '@lucide/angular';

@Component({
  selector: 'qfin-monthly-payroll',
  imports: [MonthlyPayrollDetail, LucideArrowLeft],
  templateUrl: './monthly-payroll.html',
  styles: ``,
})
export class MonthlyPayroll {
  isDetailMode = signal<boolean>(false);
  selectedMonth = signal<number>(new Date().getMonth() + 1);
  selectedYear = signal<number>(new Date().getFullYear());

  protected onViewMonth(month: number, year: number) {
    this.selectedMonth.set(month);
    this.selectedYear.set(year);
    this.isDetailMode.set(true);
  }

  protected onBackToList() {
    this.isDetailMode.set(false);
  }
}
