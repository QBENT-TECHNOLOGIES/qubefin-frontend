import { Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PayslipStore } from '../../../stores/payslip-store';
import { DocumentModalService } from '../../../../../shared/services/document-modal.service';
import { LucideDynamicIcon } from '@lucide/angular';

@Component({
  selector: 'qfin-payslip-list',
  imports: [CommonModule, MatTableModule, MatTooltipModule, LucideDynamicIcon],
  templateUrl: './payslip-list.html',
  styles: ``,
})
export class PayslipList {
  readonly data = input<any[]>([]);
  readonly documentModalService = inject(DocumentModalService);

  displayedColumns = [
    'employeeName',
    'designation',
    'organizationUnitName',
    'payrollMonthYear',
    'netPay',
    'action',
  ];

  onViewDocument(payslipId: string) {
    this.documentModalService.open({
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', // Demo path
      documentName: `Payslip_${payslipId}.pdf`,
      extension: 'pdf',
      downloadAccess: true,
    });
  }
}
