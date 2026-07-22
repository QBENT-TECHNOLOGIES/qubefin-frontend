export interface ISurveyCommitteeItem {
  id: string;
  employeeId: string;
  employeeName: string;
  isLead: boolean;
  isActive: boolean;
  assignedFrom: Date | null;
  assignedTo: Date | null;
  auditInfo: IAuditInfo | null;
}

export interface IAuditInfo {
  createdOn: Date | null;
  createdBy: string | null;
  lastModifiedOn: Date | null;
  lastModifiedBy: string | null;
}
