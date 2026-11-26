export interface LoggedInUserInfoResponse {
  id: string;
  userName: string;
  employeeId: string;
  employeeCode: string;
  employee: string;
  gender: string;
  designation: string;
  companyLogoUrl?: string;
  role: string;
  unitName: string;
  accessOrganizationUnits: AccessOrganizationUnit[];
}

interface AccessOrganizationUnit {
  id: string;
  name: string;
  code: string;
  type: string;
  latitude: number;
  longitude: number;
}
