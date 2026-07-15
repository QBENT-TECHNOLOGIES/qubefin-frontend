export interface SurveyCommitteeItem {
  id: string;
  employeeId: string;
  employeeName: string;
  isLead: boolean;
  isActive: boolean;
  assignedFrom: Date;
  assignedTo: Date;
}
