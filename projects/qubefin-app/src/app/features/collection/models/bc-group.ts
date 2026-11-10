export interface IBcGroup {
  id: string;
  code: string;
  name: string;
  designationId: string;
  designationName: string;
  creditOfficerId: string | null;
  creditOfficerName: string | null;
  organizationUnitId: string;
  organizationUnitName: string;
  organizationCode: number;
  // DateOnly on the server -> 'yyyy-MM-dd'
  formationDate: string | null;
  collectionDay: string | null;
  // TimeOnly on the server -> 'HH:mm:ss'
  collectionTime: string | null;
  isMonthlyGroup: boolean;
  // DateOnly on the server -> 'yyyy-MM-dd'
  biWeeklyStartDate: string | null;
  contactNo: string | null;
  addressLine1: string | null;
  pinCode: string | null;
}
