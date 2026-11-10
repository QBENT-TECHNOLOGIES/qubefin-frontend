/// One loan of a BC group member, with the BC loan collection row for the collection date asked for.
export interface IGroupWiseLoan {
  id: string;
  loanNo: string;
  bcGroupId: string;
  groupCode: string;
  groupName: string;
  bcMemberId: string;
  memberCode: string;
  memberName: string;
  memberMobileNo: string | null;
  loanProductName: string | null;
  loanPurpose: string | null;
  loanAmount: number | null;
  rateOfInterest: number | null;
  loanTenure: number | null;
  emiAmount: number | null;
  // DateOnly on the server -> 'yyyy-MM-dd'
  disburseDate: string | null;
  disburseAmount: number | null;
  totalPaidAmount: number | null;
  totalPaidInstallment: number | null;
  currentOutstandingAmount: number | null;
  overdueAmount: number | null;
  dpdDays: number | null;
  isClosed: boolean;
  // DateOnly on the server -> 'yyyy-MM-dd'
  closedDate: string | null;
  // Null / false until the collection sheet for that date has been raised.
  collectionId: string | null;
  collectionEmiAmount: number | null;
  collectedAmount: number | null;
  isDemandDate: boolean;
  isCollected: boolean;
  collectionRemarks: string | null;
}

export interface IGroupWiseLoans {
  loans: IGroupWiseLoan[];
  totalRecords: number;
}

export interface IGroupWiseLoanSearchParam {
  /// The credit officer's designation id, not the employee id.
  designationId: string;
  /// 'yyyy-MM-dd'.
  collectionDate: string;
  /// Null searches every group of the officer.
  bcGroupId: string | null;
  searchText: string | null;
  /// Null returns both running and closed loans.
  isClosed: boolean | null;
  sortOn: string;
  sortDirection: string;
  pageIndex: number;
  pageSize: number;
}
