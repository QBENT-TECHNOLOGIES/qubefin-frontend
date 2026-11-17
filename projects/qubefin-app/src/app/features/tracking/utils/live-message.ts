import { FieldOfficer } from '../models/field-officer';
import { GeoPoint } from '../models/geo';
import { LiveStatus } from '../models/live-position';
import { AlertSeverity, AlertType, TrackingAlert } from '../models/tracking-alert';

/**
 * Reads the messages pushed on the live socket (`services/live-socket.service.ts`).
 *
 * The GPS and alarm message shapes are not agreed with the backend yet, so these readers accept the usual field names
 * (case-insensitive), e.g. `lat`/`lng`, `latitude`/`longitude` or a nested `location`, and `timestamp`, `recordedAt`, epoch
 * seconds or milliseconds. Once the backend confirms the shapes, keep the names it sends and drop the rest.
 */

/** One GPS fix pushed on `/topic/employee/{id}/gps`. */
export interface LiveGpsFix {
  employeeId: string;
  location: GeoPoint;
  /** When the phone took the fix (ISO); the receive time when the message has none. */
  at: string;
  speedKmph: number | null;
  accuracyMeters: number | null;
  batteryPct: number | null;
  gpsEnabled: boolean | null;
  /** Only when the backend sends a `LiveStatus`; otherwise the web keeps the last polled status. */
  status: LiveStatus | null;
  distanceTodayKm: number | null;
  /** The phone reported a mock (fake) location for this fix. */
  mockLocation: boolean | null;
}

/**
 * A plain `speed` is taken as **metres per second** (what phone GPS reports). Named `speedKmph` / `speedKmh` / `speedKph`
 * are km/h. Change this if the backend sends km/h in `speed`.
 */
const PLAIN_SPEED_IS_METRES_PER_SECOND = true;

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

/** The message, out of a `data` / `payload` / `body` envelope when it has one. */
function unwrap(body: unknown): Obj {
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return {};
    }
  }
  if (!isObj(body)) return {};
  const inner = field(body, 'data', 'payload', 'body');
  return isObj(inner) ? { ...body, ...inner } : body;
}

/** First non-empty value among `names`, matched case-insensitively. */
function field(o: Obj, ...names: string[]): unknown {
  const keys = Object.keys(o);
  for (const name of names) {
    const key = keys.find((k) => k.toLowerCase() === name.toLowerCase());
    if (key !== undefined && o[key] !== null && o[key] !== undefined && o[key] !== '') return o[key];
  }
  return undefined;
}

function num(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null;
  if (typeof v === 'number') return String(v);
  return null;
}

function bool(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v !== 'string') return null;
  const s = v.trim().toLowerCase();
  if (['true', '1', 'on', 'yes', 'enabled', 'y'].includes(s)) return true;
  if (['false', '0', 'off', 'no', 'disabled', 'n'].includes(s)) return false;
  return null;
}

/** ISO instant from an ISO / date string or epoch seconds / milliseconds. */
function instant(v: unknown): string | null {
  if (typeof v === 'number' || (typeof v === 'string' && /^\d{9,}$/.test(v.trim()))) {
    const n = Number(v);
    return new Date(n < 1e12 ? n * 1000 : n).toISOString();
  }
  if (typeof v === 'string') {
    const t = Date.parse(v);
    return Number.isNaN(t) ? null : new Date(t).toISOString();
  }
  return null;
}

/** Letters only, lower case: `GPS_OFF`, `gps-off` and `GpsOff` all become `gpsoff`. */
const norm = (s: string) => s.replace(/[^a-z]/gi, '').toLowerCase();

/** Reads a point from `location` / `position` / `coords` or from the message itself. */
export function readPoint(o: Obj): GeoPoint | null {
  const nested = field(o, 'location', 'position', 'coords', 'coordinates', 'geoPoint', 'point', 'latLng');
  const src = isObj(nested) ? nested : o;
  const lat = num(field(src, 'lat', 'latitude'));
  const lng = num(field(src, 'lng', 'lon', 'long', 'longitude'));
  if (lat === null || lng === null || Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) return null;
  return { lat, lng };
}

const LIVE_STATUSES: LiveStatus[] = ['OnTask', 'AtBranch', 'Moving', 'Idle', 'GpsOff', 'Offline', 'NotPunchedIn', 'PunchedOut'];

/** The GPS fix in a `/gps` message, or null when it has no usable position. */
export function readGpsFix(employeeId: string, body: unknown, receivedAt: string): LiveGpsFix | null {
  const o = unwrap(body);
  const location = readPoint(o);
  if (!location) return null;

  const at =
    instant(field(o, 'lastSeenAt', 'recordedAt', 'capturedAt', 'fixTime', 'gpsTime', 'timestamp', 'time', 'at', 'dateTime', 'createdAt', 'createdOn')) ??
    receivedAt;

  let speedKmph = num(field(o, 'speedKmph', 'speedKmh', 'speedKph'));
  if (speedKmph === null) {
    const speed = num(field(o, 'speed'));
    speedKmph = speed === null ? null : PLAIN_SPEED_IS_METRES_PER_SECOND ? speed * 3.6 : speed;
  }
  if (speedKmph !== null) speedKmph = Math.max(0, Math.round(speedKmph * 10) / 10);

  let batteryPct = num(field(o, 'batteryPct', 'batteryPercentage', 'batteryPercent', 'battery', 'batteryLevel'));
  if (batteryPct !== null && batteryPct > 0 && batteryPct <= 1) batteryPct *= 100;
  if (batteryPct !== null) batteryPct = Math.round(batteryPct);

  const gpsRaw = field(o, 'gpsEnabled', 'isGpsEnabled', 'gpsOn', 'isGpsOn', 'gpsStatus', 'locationEnabled');
  const statusRaw = str(field(o, 'status', 'liveStatus'));

  return {
    employeeId: str(field(o, 'employeeId')) ?? employeeId,
    location,
    at,
    speedKmph,
    accuracyMeters: num(field(o, 'accuracyMeters', 'accuracy', 'horizontalAccuracy')),
    batteryPct,
    gpsEnabled: bool(gpsRaw),
    status: (statusRaw && LIVE_STATUSES.find((s) => norm(s) === norm(statusRaw))) || null,
    distanceTodayKm: num(field(o, 'distanceTodayKm', 'distanceKm')),
    mockLocation: bool(field(o, 'isMockLocation', 'mockLocation', 'isMock')),
  };
}

/** Backend alarm names → `AlertType` (letters only, lower case). Anything else is kept as sent and shown under its own name. */
const ALARM_TYPES: Record<string, AlertType> = {
  nearhome: 'NearHome',
  athome: 'NearHome',
  home: 'NearHome',
  gpsoff: 'GpsOff',
  gpsdisabled: 'GpsOff',
  locationoff: 'GpsOff',
  locationdisabled: 'GpsOff',
  stationary: 'Stationary',
  nomovement: 'Stationary',
  idle: 'Stationary',
  outsidebranchradius: 'OutsideBranchRadius',
  outofradius: 'OutsideBranchRadius',
  outsideradius: 'OutsideBranchRadius',
  geofence: 'OutsideBranchRadius',
  geofencebreach: 'OutsideBranchRadius',
  locationmismatch: 'LocationMismatch',
  mismatch: 'LocationMismatch',
  delayedjob: 'DelayedJob',
  jobdelayed: 'DelayedJob',
  delayed: 'DelayedJob',
};

function readSeverity(v: unknown): AlertSeverity {
  const s = norm(str(v) ?? '');
  if (['high', 'critical', 'veryhigh', 'severe', 'urgent'].includes(s)) return 'High';
  if (s === 'low' || s === 'info') return 'Low';
  return 'Medium';
}

export interface LiveAlarm {
  alert: TrackingAlert;
  /** False when the message had no id: the web made one up, so acknowledge / resolve wait until the polled list has it. */
  hasServerId: boolean;
}

/**
 * The alarm in an `/alarms` message as a `TrackingAlert` (status Open). Employee name, role and branch come from the message
 * or, when missing, from the caller's `field-officers` entry for that employee.
 */
export function readAlarm(employeeId: string, body: unknown, receivedAt: string, officer?: FieldOfficer): LiveAlarm {
  const o = unwrap(body);
  const rawType = str(field(o, 'type', 'alarmType', 'alertType', 'rule', 'code', 'category')) ?? 'Alarm';
  const type = (ALARM_TYPES[norm(rawType)] ?? rawType) as AlertType;
  const raisedAt =
    instant(field(o, 'raisedAt', 'alarmTime', 'alertTime', 'occurredAt', 'timestamp', 'time', 'at', 'dateTime', 'createdAt', 'createdOn')) ??
    receivedAt;
  const serverId = str(field(o, 'id', 'alarmId', 'alertId', 'uuid'));
  const notified = field(o, 'notifiedTo');

  return {
    hasServerId: !!serverId,
    alert: {
      id: serverId ?? `live:${employeeId}:${norm(rawType)}:${raisedAt}`,
      type,
      severity: readSeverity(field(o, 'severity', 'priority', 'level')),
      employeeId: str(field(o, 'employeeId')) ?? employeeId,
      employeeName: str(field(o, 'employeeName', 'name')) ?? officer?.name ?? 'Employee',
      role: (str(field(o, 'role', 'employeeRole')) ?? officer?.role ?? '') as TrackingAlert['role'],
      branchId: str(field(o, 'branchId', 'organisationUnitId', 'organizationUnitId')) ?? officer?.organisationUnitId ?? '',
      branchName: str(field(o, 'branchName', 'organisationUnitName', 'organizationUnitName')) ?? officer?.organisationUnitName ?? '',
      message: str(field(o, 'message', 'description', 'details', 'text', 'alarmMessage', 'title', 'remarks')) ?? rawType,
      location: readPoint(o),
      measuredValue: num(field(o, 'measuredValue', 'value')),
      measuredUnit: str(field(o, 'measuredUnit', 'unit')),
      jobId: str(field(o, 'jobId')),
      jobNo: str(field(o, 'jobNo', 'jobCode')),
      taskId: str(field(o, 'taskId')),
      raisedAt,
      status: 'Open',
      notifiedTo: Array.isArray(notified) ? notified.map(String) : [],
      acknowledgedByName: null,
      acknowledgedAt: null,
      resolvedByName: null,
      resolvedAt: null,
      resolutionRemarks: null,
    },
  };
}

/** Same alert: same id, or same employee and rule raised within 2 minutes (a pushed alarm vs. the polled list). */
export function sameAlert(a: TrackingAlert, b: TrackingAlert): boolean {
  if (a.id === b.id) return true;
  return a.employeeId === b.employeeId && a.type === b.type && Math.abs(Date.parse(a.raisedAt) - Date.parse(b.raisedAt)) < 120_000;
}
