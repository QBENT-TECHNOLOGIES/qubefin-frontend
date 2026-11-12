export type LoanCollectionStatus = 'PENDING' | 'PAID' | 'PARTIAL' | 'NOT_PAID';

export type PaymentMode = 'CASH' | 'UPI';

/// The editable collection sheet shown on screen. It is built from the group wise loan api
/// (see IGroupWiseLoan), which carries the saved collection row for the collection date.
export interface GroupLoan {
  loanId: string;
  loanNo: string;
  memberName: string;
  loanAmount: number;
  outstanding: number;
  overdue: number;
  emiAmount: number;
  paidAmount: number;
  remarks: string;
  /// Null for a loan collected earlier, as the loan search does not return how it was paid.
  paymentMode: PaymentMode | null;
  utrNo: string;
  status: LoanCollectionStatus;
  isLocked: boolean;
}

export interface CollectionGroup {
  id: string;
  name: string;
  creditOfficerId: string;
  loans: GroupLoan[];
  isSaved: boolean;
  isSaving: boolean;
}

export interface LoanAmountChange {
  loanId: string;
  value: number;
}

export interface LoanRemarksChange {
  loanId: string;
  value: string;
}

export interface LoanPaymentModeChange {
  loanId: string;
  value: PaymentMode;
}

export interface LoanUtrChange {
  loanId: string;
  value: string;
}
