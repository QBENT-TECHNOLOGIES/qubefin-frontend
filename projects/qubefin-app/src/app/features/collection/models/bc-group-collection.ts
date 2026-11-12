export type LoanCollectionStatus = 'PENDING' | 'PAID' | 'PARTIAL' | 'NOT_PAID';

export type PaymentMode = 'CASH' | 'UPI';

// The editable sheet on screen, built from the group wise loan api.
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
  // Null when the row collected nothing, or when the date holds more than one posting.
  paymentMode: PaymentMode | null;
  utrNo: string;
  // More than one means the amount is a total of several postings.
  collectionCount: number;
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
