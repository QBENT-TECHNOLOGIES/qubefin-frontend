import { PaymentMode } from './bc-group-collection';

/// The rules a collection entry has to pass, in one place, because two screens collect the same
/// payment: the group sheet saves a whole group at once and the payment page saves one loan. The
/// group page runs them per loan on save, the payment page feeds them to its signal form schema.

export const COLLECTION_MESSAGES = {
  collectionDateRequired: 'Collection date is required',
  paidAmountRequired: 'Paid amount is required',
  paidAmountNegative: 'Paid amount cannot be negative',
  upiAmountNotPositive: 'A UPI collection must be more than 0',
  utrRequired: 'UTR No is required for a UPI collection',
  remarksRequired: 'Remarks are required when paid amount is less than EMI',
} as const;

export interface ILoanCollectionEntry {
  paidAmount: number;
  emiAmount: number;
  remarks: string;
  paymentMode: PaymentMode | null;
  utrNo: string;
}

export function isShortPaid(paidAmount: number | null, emiAmount: number): boolean {
  return paidAmount !== null && paidAmount < emiAmount;
}

export function isNegativeAmount(paidAmount: number | null): boolean {
  return paidAmount !== null && paidAmount < 0;
}

export function isInvalidUpiAmount(
  paymentMode: PaymentMode | null,
  paidAmount: number | null,
): boolean {
  return paymentMode === 'UPI' && paidAmount !== null && paidAmount <= 0;
}

export function isMissingUtr(paymentMode: PaymentMode | null, utrNo: string): boolean {
  return paymentMode === 'UPI' && !utrNo.trim();
}

export function isMissingRemarks(
  paidAmount: number | null,
  emiAmount: number,
  remarks: string,
): boolean {
  return isShortPaid(paidAmount, emiAmount) && !remarks.trim();
}

/// The first rule the entry breaks, or null when it is good to save.
export function validateLoanCollection(entry: ILoanCollectionEntry): string | null {
  if (isNegativeAmount(entry.paidAmount)) {
    return COLLECTION_MESSAGES.paidAmountNegative;
  }
  if (isInvalidUpiAmount(entry.paymentMode, entry.paidAmount)) {
    return COLLECTION_MESSAGES.upiAmountNotPositive;
  }
  if (isMissingUtr(entry.paymentMode, entry.utrNo)) {
    return COLLECTION_MESSAGES.utrRequired;
  }
  if (isMissingRemarks(entry.paidAmount, entry.emiAmount, entry.remarks)) {
    return COLLECTION_MESSAGES.remarksRequired;
  }
  return null;
}
