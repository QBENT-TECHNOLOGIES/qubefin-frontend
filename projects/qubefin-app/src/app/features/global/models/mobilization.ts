// Community Mobilization: the prospective borrowers of an Approved Group Survey.

export const MAX_YEARLY_INCOME = 300000; // 3.00 lakh
export const MAX_INDEBTEDNESS = 200000; // 2.00 lakh
export const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widow'];

export type BorrowerDecision = 'Add' | 'Block';

export interface IBorrower {
  id: string;
  name: string;
  guardianName: string;
  mobileNo: string;
  maritalStatus: string;
  age: number;
  ownHouse: boolean;
  incomeActivity: string | null;
  income: number;
  loanAmount: number;
  // The Yes/No fields of the document, worked out from the amounts.
  incomeWithinLimit: boolean;
  indebtednessWithinLimit: boolean;
  hasNpa: boolean;
  hasWriteOff: boolean;
  isFlagged: boolean;
  flagReasons: string | null;
  decisionReason: string | null;
  // Pending, Blocked, Rejected or Member Created
  status: string;
  rejectReason: string | null;
  // Only a Pending or Blocked borrower can still be changed.
  canChange: boolean;
}

export interface IMobilization {
  surveyId: string;
  status: string;
  // True once the survey is Approved.
  isOpen: boolean;
  canEdit: boolean;
  canChangeDecision: boolean;
  borrowers: IBorrower[];
}

export interface IBorrowerRequest {
  name: string;
  guardianName: string;
  mobileNo: string;
  maritalStatus: string;
  age: number;
  ownHouse: boolean;
  incomeActivity: string | null;
  income: number;
  loanAmount: number;
  hasNpa: boolean;
  hasWriteOff: boolean;
  decision: BorrowerDecision | null;
  decisionReason: string | null;
}

export interface IBorrowerDecisionRequest {
  decision: BorrowerDecision;
  reason: string;
}

// The same rule as the server: only NPA and Write-off raise the alert. Income and pending loan only fill the two Yes / No fields.
export function getBorrowerBreaches(hasNpa: boolean, hasWriteOff: boolean): string[] {
  const breaches: string[] = [];
  if (hasWriteOff) breaches.push('Write-off is not Nil');
  if (hasNpa) breaches.push('NPA is not Nil');
  return breaches;
}
