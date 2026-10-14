import { OfficerRole } from './field-officer';
import { GeoPoint } from './geo';

export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected';

export type OutOfRadiusActivity = 'LeadSourcing' | 'CustomerVisit' | 'Survey' | 'Other';

/** Raised from the mobile app before field work beyond the branch radius. */
export interface OutOfRadiusRequest {
  id: string;
  requestNo: string;
  employeeId: string;
  employeeName: string;
  role: OfficerRole;
  branchId: string;
  branchName: string;
  branchLocation: GeoPoint | null;
  activity: OutOfRadiusActivity;
  reason: string;
  destinationName: string;
  destination: GeoPoint;
  distanceFromBranchKm: number;
  /** yyyy-MM-dd */
  requestedForDate: string;
  requestedAt: string;
  status: ApprovalStatus;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionRemarks: string | null;
}

export interface ApprovalDecisionRequest {
  approved: boolean;
  remarks: string;
}
