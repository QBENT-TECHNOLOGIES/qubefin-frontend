import { Component, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import { DocumentModalService } from '../../../../../shared/services/document-modal.service';
import { LucideDynamicIcon } from '@lucide/angular';
import { PayrollService } from '../../../services/payroll-service';
import { AlertService } from 'qubefin-core';

@Component({
  selector: 'qfin-payslip-list',
  imports: [CommonModule, MatTableModule, MatTooltipModule, LucideDynamicIcon],
  templateUrl: './payslip-list.html',
  styles: ``,
})
export class PayslipList {
  readonly data = input<any[]>([]);
  readonly documentModalService = inject(DocumentModalService);
  readonly payrollService = inject(PayrollService);
  readonly alertService = inject(AlertService);
  readonly openingPayslipId = signal<string | null>(null);

  displayedColumns = [
    'organizationUnitName',
    'designation',
    'salaryGrade',
    'payrollMonthYear',
    'totalEarning',
    'totalDeduction',
    'netPay',
    'action',
  ];

  async onViewDocument(element: any) {
    this.openingPayslipId.set(element.payslipId);

    try {
      const file = await firstValueFrom(this.payrollService.getPayslipById(element.payslipId));
      const fileUrl = URL.createObjectURL(file);

      this.documentModalService.open({
        url: fileUrl,
        documentName: `Payslip_${element.payrollMonthYear}`,
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
