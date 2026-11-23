/**
 * Daily distance report from the GPS service (`environment.gpsServiceUrl`, "WEGrow GPS Service API" → GPS Reports):
 * `POST /api/v1/reports` (everyone in the caller's scope) and `POST /api/v1/reports/by-employees` (chosen employees).
 * Property names are the service's own.
 */

/** Body of `POST /api/v1/reports`. Only `fromDate` is required; the service defaults the rest. */
export interface DailyDistanceReportRequest {
  /** "yyyy-MM-dd", inclusive. */
  fromDate: string;
  /** "yyyy-MM-dd", inclusive; must be on or after `fromDate`. */
  toDate?: string;
  /** Count fixes the phone marked as simulated (default false). */
  includeMockLocations?: boolean;
  /** Ignore fixes less accurate than this, in metres (default 100). */
  maxAccuracyMeters?: number;
  /** Ignore jumps longer than this between two fixes, in metres (default 5000). */
  maxSegmentMeters?: number;
  /** Ignore moves shorter than this between two fixes (GPS jitter), in metres (default 5). */
  minSegmentMeters?: number;
}

/** Body of `POST /api/v1/reports/by-employees`: the same, plus at least one employee id. */
export interface DailyDistanceByEmployeesRequest extends DailyDistanceReportRequest {
  employeeIds: string[];
}

/** One employee's distance on one day. Times are UTC ISO; the day is the local (IST) calendar day. */
export interface DailyDistance {
  date: string;
  totalDistanceMeters: number;
  totalDistanceKm: number;
  startMileage: number | null;
  endMileage: number | null;
  pointCount: number;
  firstPointTime: string | null;
  lastPointTime: string | null;
  activeMinutes: number;
  maxSpeedKmh: number;
  avgSpeedKmh: number;
}

/** One employee in the report; `days` holds only the days with GPS fixes. */
export interface OfficerReport {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  designation: string;
  post: string;
  unitName: string;
  organizationUnitName: string;
  /** The person who asked for the report. */
  isViewer: boolean;
  canAssign: boolean;
  days: DailyDistance[];
}

export interface DailyDistanceReportResponse {
  /** The caller. */
  employeeId: string;
  employeeName: string;
  unitName: string;
  fromDate: string;
  toDate: string;
  employeeCount: number;
  employees: OfficerReport[];
}

/**
 * Odometer (mileage) vs GPS for one day: only when both start and end readings exist. `differenceKm` is
 * odometer km − GPS km (positive = the odometer shows more than was tracked).
 */
export interface MileageCheck {
  mileageKm: number;
  trackingKm: number;
  differenceKm: number;
  /** Difference as % of the GPS km; null when nothing was tracked. */
  differencePct: number | null;
}

/** A day with its mileage check (null when a start or end reading is missing). */
export interface DailyDistanceRow extends DailyDistance {
  mileage: MileageCheck | null;
}

/** An employee row with its period totals, built on the web from `days`. */
export interface OfficerReportRow extends Omit<OfficerReport, 'days'> {
  days: DailyDistanceRow[];
  daysWithData: number;
  totalKm: number;
  /** Total km ÷ days with GPS data. */
  avgKmPerDay: number;
  activeMinutes: number;
  pointCount: number;
  /** Days with both odometer readings. */
  mileageDays: number;
  /** Totals over the days with both readings; null when there are none. */
  mileage: MileageCheck | null;
  /** For sorting: odometer km and difference (−Infinity when unknown, so they sort last). */
  mileageKm: number;
  differenceKm: number;
}
