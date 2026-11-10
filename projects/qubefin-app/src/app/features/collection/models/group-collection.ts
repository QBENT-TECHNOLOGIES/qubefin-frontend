export interface ILoanCollectionRequest {
  loanId: string;
  collectionAmount: number;
  isUpiCollection: boolean;
  utrNo: string | null;
  remarks: string | null;
}

export interface ISaveGroupCollectionRequest {
  designationId: string;
  bcGroupId: string;
  /// 'yyyy-MM-dd'.
  collectionDate: string;
  loans: ILoanCollectionRequest[];
}
