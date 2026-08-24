import { Component, inject, signal } from '@angular/core';
import { MonthlyPayrollDetail } from '../../components/monthly-payroll-detail/monthly-payroll-detail';
import { LucideDynamicIcon } from '@lucide/angular';
import { MonthWisePayrolls } from '../../components/month-wise-payrolls/month-wise-payrolls';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { CreatePayrollModal } from '../../components/create-payroll-modal/create-payroll-modal';
import { CompanyStore } from '../../../global/stores/company-store';
import { AlertService, months } from 'qubefin-core';
import { PayrollStore } from '../../stores/payroll-store';
@Component({
  selector: 'qfin-monthly-payroll',
  imports: [
    CommonModule,
    MonthlyPayrollDetail,
    MonthWisePayrolls,
    LucideDynamicIcon,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    FormsModule,
  ],
  templateUrl: './monthly-payroll.html',
})
export class MonthlyPayroll {
  private readonly dialog = inject(MatDialog);
  private readonly payrollStore = inject(PayrollStore);
  readonly companyStore = inject(CompanyStore);
  private readonly alertService = inject(AlertService);
  isDetailMode = signal<boolean>(false);

  selectedMonth = signal<number | null>(null);
  selectedYear = signal<number | null>(new Date().getFullYear());
  selectedCompanyId = signal<string | null>(null);
  readonly months = months;
  readonly years = Array.from({ length: 4 }, (_, index) => new Date().getFullYear() - index);

  showFilterArea = signal<boolean>(false);

  readonly iconMap = APP_ICONS_MAP;

  protected onViewMonth(month: any, year: any) {
    this.selectedMonth.set(month);
    this.selectedYear.set(year);
    this.isDetailMode.set(true);
  }

  protected onBackToList() {
    this.isDetailMode.set(false);
  }

  protected toggleFilterArea() {
    this.showFilterArea.update((v) => !v);
  }

  protected searchPayrolls() {
    const year = this.selectedYear();
    if (!year) {
      this.alertService.warning('Required', 'Please select a year.');
      return;
    }

    this.payrollStore.setMonthlyPayrollSummariesParams(
      this.selectedCompanyId(),
      this.selectedMonth(),
      year,
    );
  }

  protected resetFilters() {
    this.selectedCompanyId.set(null);
    this.selectedMonth.set(null);
    this.selectedYear.set(null);
    this.payrollStore.clearMonthlyPayrollSummariesParams();
  }

  openCreatePayrollModal() {
    this.dialog.open(CreatePayrollModal, {
      width: '450px',
      disableClose: true,
      panelClass: 'glass-modal',
    });
  }

  protected getMonthName(monthNum: number): string {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return months[monthNum - 1] || '';
  }
}
