export interface ICandidateList {
  id: string;
  fullName: string;
  interviewPost: string;
  interviewDate: string;
  recommendationStatus: string;
  totalRatingPoint: number;
  ratingStatus: string;
}
export interface ICandidateSearchModel {
  tempSearch: string;
  companyId: string;
}
export interface ICandidate {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: string;
  fatherName?: string;
  mobileNo: string;
  email?: string;
  houseNo?: string;
  roadName?: string;
  landmark?: string;
  administrativeUnitId?: string;
  policeStationId?: string;
  postOfficeId?: string;
  pinCode?: string;
  referenceNo?: string;
  interviewDate: string;
  interviewTime?: string;
  departmentId?: string;
  interviewPost: string;
  venueOrganizationUnitId?: string;
  interviewMode?: string;
  referedBy?: string;
  recruitmentSource?: string;
  vacancyReference?: string;
  currentSalary?: number;
  expectedSalary?: number;
  noticePeriodInDays?: number;
  earliestJoiningDate?: string;
  isWillingRelocate: boolean;
  preferredLocation?: string;
  postedOrganizationUnitId?: string;
  dateOfJoining?: string;
  reportingTime?: string;
  monthlyCostCompany?: number;
  overallPerformance?: string;
  suitableRoleDepartment?: string;
  recommendedGradeId?: string;
  isTrainingRequired: boolean;
  recommendationStatus?: string;
  totalRatingPoint?: number;
  ratingStatus?: string;
  aadharNumber?: string;
  isAadharValidated: boolean;
  voterNumber?: string;
  isVoterValited: boolean;
  pan?: string;
  isPanValidated: boolean;
  isMobileValidated: boolean;
  uan?: string;
  isUanVerified: boolean;
  isCreditBureauChecked: boolean;
  creditBureauReportLink?: string;
}
export interface ICandidateDetail {
  companyId: string;
  firstName: string;
  lastName: string;
  gender: string;
  mobileNo: string;
  interviewDate: string;
  interviewPost: string;
}
