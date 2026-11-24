// Group Master (Member menu). The columns of Tbl_Group.

// Collection day: 1 = Monday ... 7 = Sunday (the server uses the same numbers).
export const GROUP_DAYS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
];

export interface IGroupListItem {
  id: string;
  code: string;
  name: string;
  branchName: string | null;
  areaName: string | null;
  creditOfficerName: string | null;
  collectionDay: number;
  collectionDayName: string;
  collectionTime: string;
  formationDate: string;
  status: string;
}

export interface IGroupDetail {
  id: string;
  code: string;
  surveyId: string | null;
  surveyAssignmentNo: string | null;
  branchId: string | null;
  branchName: string | null;
  designationId: string | null;
  creditOfficerName: string | null;
  name: string;
  collectionDay: number;
  collectionTime: string;
  biweeklyStartDate: string | null;
  formationDate: string;
  mobileNo: string;
  administrativeUnitId: string;
  areaName: string | null;
  pinCode: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  landMark: string | null;
  status: string;
  verifiedByName: string | null;
  verifiedOn: string | null;
  verifiedRemarks: string | null;
  createdByName: string | null;
  createdOn: string;
  canEdit: boolean;
  canDecide: boolean;
}

// What the screen sends to add or update a group. Dates are 'yyyy-MM-dd', time is 'HH:mm:ss'.
export interface IGroupRequest {
  surveyId: string | null;
  designationId: string;
  name: string;
  collectionDay: number;
  collectionTime: string;
  biweeklyStartDate: string | null;
  formationDate: string;
  mobileNo: string;
  administrativeUnitId: string;
  pinCode: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  landMark: string | null;
}

export interface IGroupCreditOfficerOption {
  designationId: string;
  name: string;
}

export interface IGroupSurveyOption {
  id: string;
  assignmentNo: string;
  proposedArea: string;
  administrativeUnitId: string;
  latitude: number | null;
  longitude: number | null;
  landMark: string | null;
}

export interface IGroupAddInfo {
  canAdd: boolean;
  isHead: boolean;
  branchId: string | null;
  branchName: string | null;
  creditOfficers: IGroupCreditOfficerOption[];
  surveys: IGroupSurveyOption[];
}

export interface IGroupDecisionRequest {
  decision: 'Approve' | 'Reject';
  comments: string | null;
}
