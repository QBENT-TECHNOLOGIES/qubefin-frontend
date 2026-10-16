export type ExceptionRule = 'NearHome' | 'Stationary' | 'OutsideBranchRadius' | 'GpsOff' | 'All';

/** Operational exceptions defined by management (e.g. lunch break, branch-approved camps). */
export interface TrackingException {
  id: string;
  name: string;
  appliesTo: ExceptionRule;
  description: string;
  /** Optional daily window, HH:mm. */
  fromTime: string | null;
  toTime: string | null;
  isActive: boolean;
}

export interface TrackingSettings {
  /** Alert when an employee is within this distance of their residence during duty. */
  homeRadiusMeters: number;
  /** Alert when stationary longer than this while travelling. */
  stationaryMinutes: number;
  /** Alert when beyond this distance from the assigned branch. */
  branchRadiusKm: number;
  /** Default distance used to accept arrival / completion at a task location. */
  locationMatchRadiusMeters: number;
  /** Grace period before a GPS-off alert is raised. */
  gpsOffGraceMinutes: number;
  /** A halt counts as a stop when the employee stays within `stopRadiusMeters` for at least this long. */
  stopMinMinutes: number;
  stopRadiusMeters: number;
  /** How often the mobile app should send a fix. */
  positionIntervalSeconds: number;
  workingHoursStart: string;
  workingHoursEnd: string;
  notifyReportingOfficer: boolean;
  notifyCreditOfficer: boolean;
  notifyAdministration: boolean;
  /** System-generated allocation rules. */
  autoAssignOdFollowUps: boolean;
  autoAssignOdMinDpd: number;
  autoAssignGroupMeetings: boolean;
  autoAllocationTime: string;
  exceptions: TrackingException[];
  lastModifiedByName: string | null;
  lastModifiedAt: string | null;
}
