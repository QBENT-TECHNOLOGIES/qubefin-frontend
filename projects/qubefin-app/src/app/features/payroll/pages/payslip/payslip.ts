import { Component, inject } from '@angular/core';
import { PayslipList } from '../../components/payslip/payslip-list/payslip-list';
import { PayslipStore } from '../../stores/payslip-store';
import { APP_ICONS_MAP } from '../../../../lucide-icons';

@Component({
  selector: 'qfin-payslip',
  imports: [PayslipList],
  templateUrl: './payslip.html',
  styles: ``,
})
export class Payslip {
  readonly iconMap = APP_ICONS_MAP;
  readonly payslipStore = inject(PayslipStore);

  readonly payslips = this.payslipStore.PayslipsList;
}
