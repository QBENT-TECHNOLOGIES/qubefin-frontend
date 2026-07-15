export interface SurveyCommitteeItem {
  id: string;
  employeeId: string;
  isLead: boolean;
  isActive: boolean;
  assignedFrom: Date;
  assignedTo: Date;
}
