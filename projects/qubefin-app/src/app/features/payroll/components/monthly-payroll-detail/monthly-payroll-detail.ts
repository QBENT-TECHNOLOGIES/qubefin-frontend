import { PayrollService } from './../../services/payroll-service';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { PayrollStore } from '../../stores/payroll-store';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog } from '@angular/material/dialog';
import { PayrollEditModal } from '../payroll-edit-modal/payroll-edit-modal';
import { IMonthlyPayrollLineItem } from '../../models/payroll-model';
import { DocumentModalService } from 'qubefin-core';
import { AlertService } from 'qubefin-core';
import { firstValueFrom } from 'rxjs';
import { ReportService } from '../../../Report/Service/report-service';

@Component({
  selector: 'qfin-monthly-payroll-detail',
  imports: [
    CommonModule,
    CurrencyPipe,
    LucideDynamicIcon,
    MatTooltipModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
  templateUrl: './monthly-payroll-detail.html',
})
export class MonthlyPayrollDetail {
  private readonly payrollStore = inject(PayrollStore);
  private readonly dialog = inject(MatDialog);
  private readonly PayrollService = inject(PayrollService);
  private readonly reportService = inject(ReportService);
  private readonly documentModalService = inject(DocumentModalService);
  readonly payrollService = inject(PayrollService);
  readonly alertService = inject(AlertService);

  readonly openingPayslipId = signal<string | null>(null);
  month = input.required<number>();
  year = input.required<number>();

  monthlyPayroll = this.payrollStore.monthlyPayroll;
  loading = this.payrollStore.monthlyPayrollLoading;

  protected readonly expandedOrgUnitIds = signal<Set<string>>(new Set());
  protected readonly search = signal('');
  protected readonly sortBy = signal<'netPay' | 'name'>('netPay');
  readonly icons = APP_ICONS_MAP;

  // Totals across every organization unit of the month.
  protected readonly summary = computed(() => {
    const headers = this.monthlyPayroll()?.headers ?? [];
    const earnings = headers.reduce((sum, h) => sum + h.totalEarnings, 0);
    const deductions = headers.reduce((sum, h) => sum + h.totalDeductions, 0);
    return {
      units: headers.length,
      employees: headers.reduce((sum, h) => sum + h.details.length, 0),
      earnings,
      deductions,
      employerContribution: headers.reduce((sum, h) => sum + h.employerContribution, 0),
      netPay: earnings - deductions,
    };
  });

  // Units filtered by the search (a unit-name match keeps all its employees) with employees sorted.
  protected readonly units = computed(() => {
    const term = this.search().trim().toLowerCase();
    const matches = (value: string | undefined | null) => !!value && value.toLowerCase().includes(term);
    const byNetPay = (a: IMonthlyPayrollLineItem, b: IMonthlyPayrollLineItem) =>
      this.netPay(b.totalEarnings, b.totalDeductions) - this.netPay(a.totalEarnings, a.totalDeductions);
    const byName = (a: IMonthlyPayrollLineItem, b: IMonthlyPayrollLineItem) =>
      a.employeeName.localeCompare(b.employeeName);

    return (this.monthlyPayroll()?.headers ?? [])
      .map((header) => {
        const employees =
          !term || matches(header.organizationUnitName)
            ? header.details
            : header.details.filter(
                (emp) =>
                  matches(emp.employeeName) || matches(emp.designationTitle) || matches(emp.companyName),
              );
        return {
          header,
          employees: [...employees].sort(this.sortBy() === 'name' ? byName : byNetPay),
        };
      })
      .filter((unit) => unit.employees.length > 0);
  });

  protected readonly allExpanded = computed(
    () =>
      this.units().length > 0 &&
      this.units().every((u) => this.expandedOrgUnitIds().has(u.header.organizationUnitId)),
  );
  constructor() {
    effect(() => {
      this.payrollStore.setMonthlyPayrollParams(this.month(), this.year());
    });
    effect(() => {
      const payroll = this.monthlyPayroll();
      if (!payroll || !payroll.headers.length) return;

      const headOffice = payroll.headers.find(
        (h) => h.organizationUnitName.replace(/\s+/g, '').toLowerCase() === 'headoffice',
      );
      this.expandedOrgUnitIds.set(
        new Set([headOffice?.organizationUnitId ?? payroll.headers[0].organizationUnitId]),
      );
    });
  }

  // While searching every matching unit is shown open.
  isExpanded(orgUnitId: string): boolean {
    return !!this.search().trim() || this.expandedOrgUnitIds().has(orgUnitId);
  }

  togglePanel(orgUnitId: string) {
    this.expandedOrgUnitIds.update((current) => {
      const updated = new Set(current);
      if (!updated.delete(orgUnitId)) updated.add(orgUnitId);
      return updated;
    });
  }

  toggleAll() {
    this.expandedOrgUnitIds.set(
      this.allExpanded() ? new Set() : new Set(this.units().map((u) => u.header.organizationUnitId)),
    );
  }

  onViewEmployeePayroll(payrollId: string) {
    this.dialog.open(PayrollEditModal, {
      data: { id: payrollId },
      // width: '1000px',
      maxWidth: '95vw',
      panelClass: 'glass-modal',
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
  async downloadPayslip(id: string, employeeId: string, empName: string) {
    this.openingPayslipId.set(id);
    try {
      const file = await firstValueFrom(this.reportService.getPayslipById(id));
      const fileUrl = URL.createObjectURL(file);

      this.documentModalService.open({
        url: fileUrl,
        documentName: `${empName}-Payslip of ${this.month()}-${this.year()}.pdf`,
        extension: 'pdf',
        downloadAccess: true,
      });
    } catch (error: any) {
      this.alertService.error('Failed', error?.error?.message ?? 'Unable to load payslip.');
    } finally {
      this.openingPayslipId.set(null);
    }
  }
}
