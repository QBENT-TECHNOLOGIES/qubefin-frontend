import { OfficerRole } from './field-officer';
import { GeoPoint } from './geo';
import { JobTaskStatus, TaskType } from './job';

export type LiveStatus = 'OnTask' | 'AtBranch' | 'Moving' | 'Idle' | 'GpsOff' | 'Offline' | 'NotPunchedIn' | 'PunchedOut';

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
  /** Task point the employee is inside right now (status OnTask). */
  currentTaskId: string | null;
  currentTaskTitle: string | null;
  currentJobId: string | null;
  currentJobNo: string | null;
  /** Pending tasks across the employee's open jobs. */
  openTaskCount: number;
  /** Distance travelled today so far. */
  distanceTodayKm: number | null;
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

/**
 * Designated = the stop is within the match radius of a task point of one of the employee's jobs
 * (or the branch office). Undesignated = anywhere else.
 */
export type StopKind = 'Designated' | 'Undesignated';

export type StopPlace = 'Task' | 'Branch' | 'Home' | null;

export interface RouteStop {
  /** 1-based order within the day. */
  seq: number;
  location: GeoPoint;
  from: string;
  to: string;
  durationMinutes: number;
  kind: StopKind;
  place: StopPlace;
  /** Task title / branch name for a designated stop; null otherwise. */
  label: string | null;
  taskId: string | null;
  taskNo: string | null;
  jobId: string | null;
  jobNo: string | null;
  /** The matched task was completed during this stop. */
  taskCompleted: boolean;
  /** Distance from the matched point (designated) or the nearest task point (undesignated). */
  distanceMeters: number | null;
}

/** A task point the employee was expected to work on that day. */
export interface RouteTaskPoint {
  taskId: string;
  taskNo: string;
  jobId: string;
  jobNo: string;
  title: string;
  type: TaskType;
  location: GeoPoint;
  matchRadiusMeters: number;
  /** Status at the end of that day. */
  status: JobTaskStatus;
  completedAt: string | null;
  /** At least one stop was inside its radius that day. */
  visited: boolean;
}

export interface RouteSummary {
  totalDistanceKm: number;
  movingMinutes: number;
  designatedStops: number;
  designatedMinutes: number;
  undesignatedStops: number;
  undesignatedMinutes: number;
  tasksCompleted: number;
  taskPointsVisited: number;
  taskPointsPlanned: number;
  firstFixAt: string | null;
  lastFixAt: string | null;
}

export interface EmployeeRoute {
  employeeId: string;
  /** yyyy-MM-dd */
  date: string;
  /** True when `date` is today and the employee is still punched in. */
  isLive: boolean;
  points: RoutePoint[];
  stops: RouteStop[];
  taskPoints: RouteTaskPoint[];
  summary: RouteSummary;
  totalDistanceKm: number;
  punchInAt: string | null;
  punchOutAt: string | null;
}
