import { PaymentMode } from './bc-group-collection';

// The collection rules in one place, shared by the group sheet and the payment page.
export const COLLECTION_MESSAGES = {
  collectionDateRequired: 'Collection date is required',
  paidAmountRequired: 'Paid amount is required',
  paidAmountNegative: 'Paid amount cannot be negative',
  paidAmountNotPositive: 'Paid amount must be greater than 0',
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

// Rejects 0 too. Payment page only - a group row may be 0, meaning nothing was collected.
export function isNotPositiveAmount(paidAmount: number | null): boolean {
  return paidAmount !== null && paidAmount <= 0;
}

// A row that collected nothing is never a UPI payment, whatever its mode says.
export function collectsByUpi(paymentMode: PaymentMode | null, paidAmount: number | null): boolean {
  return paymentMode === 'UPI' && paidAmount !== null && paidAmount > 0;
}

export function isMissingUtr(
  paymentMode: PaymentMode | null,
  paidAmount: number | null,
  utrNo: string,
): boolean {
  return collectsByUpi(paymentMode, paidAmount) && !utrNo.trim();
}

export function isMissingRemarks(
  paidAmount: number | null,
  emiAmount: number,
  remarks: string,
): boolean {
  return isShortPaid(paidAmount, emiAmount) && !remarks.trim();
}

// The first rule the entry breaks, or null when it is good to save.
export function validateLoanCollection(entry: ILoanCollectionEntry): string | null {
  if (isNegativeAmount(entry.paidAmount)) {
    return COLLECTION_MESSAGES.paidAmountNegative;
  }
  if (isMissingUtr(entry.paymentMode, entry.paidAmount, entry.utrNo)) {
    return COLLECTION_MESSAGES.utrRequired;
  }
  if (isMissingRemarks(entry.paidAmount, entry.emiAmount, entry.remarks)) {
    return COLLECTION_MESSAGES.remarksRequired;
  }
  return null;
}
