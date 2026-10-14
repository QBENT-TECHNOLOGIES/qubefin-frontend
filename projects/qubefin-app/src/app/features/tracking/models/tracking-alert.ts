import { OfficerRole } from './field-officer';
import { GeoPoint } from './geo';

export type AlertType =
  | 'NearHome'
  | 'GpsOff'
  | 'Stationary'
  | 'OutsideBranchRadius'
  | 'LocationMismatch'
  | 'LateTask';

export type AlertSeverity = 'Low' | 'Medium' | 'High';

export type AlertStatus = 'Open' | 'Acknowledged' | 'Resolved';

export interface TrackingAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  employeeId: string;
  employeeName: string;
  role: OfficerRole;
  branchId: string;
  branchName: string;
  message: string;
  location: GeoPoint | null;
  /** Rule-specific measurement, e.g. 22 (minutes stationary) or 34.5 (km from branch). */
  measuredValue: number | null;
  measuredUnit: string | null;
  taskId: string | null;
  raisedAt: string;
  status: AlertStatus;
  /** Names of the reporting officials / admin users the alert was sent to. */
  notifiedTo: string[];
  acknowledgedByName: string | null;
  acknowledgedAt: string | null;
  resolvedByName: string | null;
  resolvedAt: string | null;
  resolutionRemarks: string | null;
}

export interface AlertSearchRequest {
  status: AlertStatus | null;
  type: AlertType | null;
  severity: AlertSeverity | null;
  branchId: string | null;
  employeeId: string | null;
  fromDate: string | null;
  toDate: string | null;
  pageIndex: number;
  pageSize: number;
}

export interface AlertSearchResponse {
  alerts: TrackingAlert[];
  totalRecords: number;
  /** Open alert counts per type, for the summary strip. */
  openByType: Record<AlertType, number>;
}

export interface ResolveAlertRequest {
  remarks: string;
}
