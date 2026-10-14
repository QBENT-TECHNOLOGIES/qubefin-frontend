import { OfficerRole } from './field-officer';
import { GeoPoint } from './geo';

export type LiveStatus = 'OnTask' | 'Moving' | 'Idle' | 'GpsOff' | 'Offline' | 'NotPunchedIn';

/** Latest known position of one field employee. */
export interface LivePosition {
  employeeId: string;
  employeeName: string;
  role: OfficerRole;
  branchId: string;
  branchName: string;
  location: GeoPoint | null;
  accuracyMeters: number | null;
  speedKmph: number | null;
  /** When the mobile app last reported a fix. */
  lastSeenAt: string | null;
  gpsEnabled: boolean;
  status: LiveStatus;
  punchedInAt: string | null;
  currentTaskId: string | null;
  currentTaskTitle: string | null;
  distanceFromBranchKm: number | null;
  batteryPct: number | null;
  openAlertCount: number;
}

export interface RoutePoint {
  lat: number;
  lng: number;
  at: string;
  speedKmph: number | null;
}

export interface RouteStop {
  location: GeoPoint;
  from: string;
  to: string;
  durationMinutes: number;
  /** Name of the task / place if the stop matched one. */
  label: string | null;
}

export interface EmployeeRoute {
  employeeId: string;
  /** yyyy-MM-dd */
  date: string;
  points: RoutePoint[];
  stops: RouteStop[];
  totalDistanceKm: number;
  punchInAt: string | null;
  punchOutAt: string | null;
}
