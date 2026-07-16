import { Component, inject, signal } from '@angular/core';
import { MonthlyPayrollDetail } from '../../components/monthly-payroll-detail/monthly-payroll-detail';
import { LucideDynamicIcon } from '@lucide/angular';
import { MonthWisePayrolls } from '../../components/month-wise-payrolls/month-wise-payrolls';
import { Breadcrumb } from '../../../../layouts/secure/breadcrumb/breadcrumb';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { CreatePayrollModal } from '../../components/create-payroll-modal/create-payroll-modal';
@Component({
  selector: 'qfin-monthly-payroll',
  imports: [CommonModule, MonthlyPayrollDetail, MonthWisePayrolls, Breadcrumb, LucideDynamicIcon, MatFormFieldModule, MatInputModule, MatSelectModule, FormsModule],
  templateUrl: './monthly-payroll.html',
})
export class MonthlyPayroll {
  private readonly dialog = inject(MatDialog);
  isDetailMode = signal<boolean>(false);
 
  selectedMonth = signal<number>(new Date().getMonth() + 1);
  selectedYear = signal<number>(new Date().getFullYear());

  showFilterArea = signal<boolean>(false);

  readonly iconMap = APP_ICONS_MAP;
 
  protected onViewMonth(month: number, year: number) {
    this.selectedMonth.set(month);
    this.selectedYear.set(year);
    this.isDetailMode.set(true);
  }
 
  protected onBackToList() {
    this.isDetailMode.set(false);
  }

  protected toggleFilterArea() {
    this.showFilterArea.update(v => !v);
  }

  protected getMonthName(monthNum: number): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthNum - 1] || '';
  }
  openCreatePayrollModal() {
    this.dialog.open(CreatePayrollModal, {
      width: '450px',
      disableClose: true,
      panelClass: 'glass-modal'
    });
  }
}
