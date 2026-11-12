import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideDynamicIcon } from '@lucide/angular';
import {
  CollectionGroup,
  GroupLoan,
  LoanAmountChange,
  LoanPaymentModeChange,
  LoanRemarksChange,
  LoanUtrChange,
  PaymentMode,
} from '../../models/bc-group-collection';

@Component({
  selector: 'qfin-bc-group-loan-table',
  imports: [CommonModule, LucideDynamicIcon],
  templateUrl: './bc-group-loan-table.html',
})
export class BcGroupLoanTable {
  readonly group = input.required<CollectionGroup>();

  readonly paidChange = output<LoanAmountChange>();
  readonly remarksChange = output<LoanRemarksChange>();
  readonly paymentModeChange = output<LoanPaymentModeChange>();
  readonly utrChange = output<LoanUtrChange>();
  readonly save = output<string>();

  readonly isExpanded = signal<boolean>(true);

  readonly groupCollected = computed(() =>
    this.group().loans.reduce((total, loan) => total + loan.paidAmount, 0),
  );

  readonly hasOpenLoans = computed(() => this.group().loans.some((loan) => !loan.isLocked));

  toggle() {
    this.isExpanded.update((value) => !value);
  }

  isShortPaid(loan: GroupLoan): boolean {
    return loan.paidAmount < loan.emiAmount;
  }

  // Nothing collected, so no payment mode and no UTR.
  isCollecting(loan: GroupLoan): boolean {
    return loan.paidAmount > 0;
  }

  onPaidInput(loanId: string, event: Event) {
    const value = Number((event.target as HTMLInputElement).value) || 0;
    this.paidChange.emit({ loanId, value });
  }

  onPaidWheel(event: WheelEvent) {
    (event.target as HTMLInputElement).blur();
  }

  onRemarksInput(loanId: string, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.remarksChange.emit({ loanId, value });
  }

  onModeSelect(loanId: string, value: PaymentMode) {
    this.paymentModeChange.emit({ loanId, value });
  }

  onUtrInput(loanId: string, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.utrChange.emit({ loanId, value });
  }

  onSave() {
    this.save.emit(this.group().id);
  }
}
