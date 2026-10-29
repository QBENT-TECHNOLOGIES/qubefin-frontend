export interface IJoiningApprovalListItem {
  id: string;
  employeeId: string;
  referenceNo: string;
  employeeName: string;
  employeeCode: string | null;
  designation: string | null;
  organizationUnit: string | null;
  company: string | null;
  department: string | null;
  salaryGrade: string | null;
  monthlyCtc: number;
  offerLetterDate: string;
  joiningDate: string | null;
  qualification: string | null;
  approvalStatus: string;
}

export interface IJoiningInfoAction {
  joiningInfoId: string;
  isApproved: boolean;
}
