export interface IAttendanceRegularization {
  id: string;
  regularizationType: string | null;
  regularizationDate: string | null;
  reason: string;
  status: string | null;
  attachment: string | null;
}

export interface IAttendanceRegularizationEvent {
  eventStatus: string;
  eventDate: string | Date;
  remarks: string;
  designation?: string | null;
}

export interface IAttendanceRegularizationDetail {
  id: string;
  employeeId: string;
  regularizationType: string | null;
  regularizationDates: string | null;
  reason: string;
  attachment: string | null;
  attachmentUrl: string | null;
  createdBy: string;
  createdOn: string;
  currentStatus: string | null;
  isRecommendEvent?: boolean;
  isApprovalEvent?: boolean;
  remarks: string | null;
  events?: IAttendanceRegularizationEvent[];
}

export interface IRegularizationForm {
  regularizationType: string;
  reason: string | null;
  regularizationDates: Date[];
  actualInTime: string | Date | null;
  actualOutTime: string | Date | null;
  remarks: string;
}

export interface IApprovalRegularization {
  id: string;
  employeeName: string | null;
  organizationUnit: string | null;
  regularizationType: string | null;
  regularizationDate: string | null;
  reason: string;
  status: string | null;
  attachment: string | null;
}
