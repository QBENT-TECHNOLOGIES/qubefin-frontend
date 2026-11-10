export interface ICreditOfficer {
  employeeId: string;
  employeeName: string;
  employeeCode: string | null;
  designationId: string;
  designationName: string;
  isIncharge: boolean;
  organizationUnitId: string;
  organizationUnitName: string;
  organizationCode: number;
  organizationUnitTypeName: string;
}

export interface ICreditOfficerBranch {
  name: string;
  officers: ICreditOfficer[];
}
