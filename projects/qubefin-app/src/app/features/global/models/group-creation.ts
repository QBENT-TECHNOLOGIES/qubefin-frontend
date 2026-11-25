// Group Creation: after a GRT Pass, a Credit Officer of the survey creates the group in one window.

export const GROUP_ROLES = ['President', 'Secretary', 'Cashier'];

export interface ICreateInfoBorrower {
  id: string;
  name: string;
  guardianName: string;
  mobileNo: string;
  age: number;
  maritalStatus: string;
}

export interface ICreateInfoPerson {
  name: string;
  designation: string | null;
  code: string | null;
}

// What the Group Creation window needs.
export interface IGroupCreateInfo {
  surveyId: string;
  // The survey's Credit Officer can create it: GRT submitted as Pass, no group yet.
  canCreate: boolean;
  // Why it is not possible now.
  reason: string | null;
  groupId: string | null;
  groupName: string | null;
  groupCode: string | null;

  branchName: string | null;
  proposedArea: string;
  administrativeUnitId: string;
  areaName: string | null;
  latitude: number | null;
  longitude: number | null;
  landMark: string | null;

  // 'Complete' or 'Pending'
  cgtStatus: string;
  grtStatus: string;
  conductedBy: ICreateInfoPerson | null;

  // The Responsible Credit Officer: the person who creates the group.
  creditOfficer: ICreateInfoPerson | null;
  creditOfficerJoinedOn: string | null;

  borrowers: ICreateInfoBorrower[];
}

export interface IGroupMemberRequest {
  borrowerId: string;
  proposedLoanAmount: number;
  loanPurpose: string;
  remarks: string | null;
  // President, Secretary or Cashier; null for a plain member.
  role: string | null;
  appointmentDate: string | null;
}

export interface ICreateGroupFromSurveyRequest {
  name: string;
  formationDate: string;
  collectionDay: number;
  collectionTime: string;
  mobileNo: string;
  sittingPlace: string;
  policeStation: string | null;
  postOffice: string | null;
  pinCode: string | null;
  address: string | null;
  landMark: string | null;
  latitude: number | null;
  longitude: number | null;
  members: IGroupMemberRequest[];
}
