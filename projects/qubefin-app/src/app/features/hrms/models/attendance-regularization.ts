export interface IAttendanceRegularization {
  id: string;
  regularizationType: string | null;
  regularizationDate: string | null;
  reason: string;
  status: string | null;
  attachment: string | null;
}

export interface IAttendanceRegularizationEvent {
  approvalCategory: string | null;
  eventDate: string | null;
  remarks: string | null;
  senderDesignation: string | null;
  receiverDesignation: string | null;
  eventCategory: string | null;
  eventStatus: string | null;
  eventButtonText: string | null;
}

export interface IAttendanceRegularizationDetail {
  id: string;
  employeeId: string;
  regularizationType: string | null;
  regularizationDates: string | null;
  reason: string;
  attachment: string | null;
  createdBy: string;
  createdOn: string;
  currentStatus: string | null;
  isRecommendVisible?: boolean;
  isApprovalVisible?: boolean;
  events?: IAttendanceRegularizationEvent[];
}

export interface IRegularizationForm {
  regularizationType: string;
  reason: string;
  regularizationDates: Date[];
}

export interface IAttendanceRegularizationDetailResponse {
  response: IAttendanceRegularizationDetail;
}
