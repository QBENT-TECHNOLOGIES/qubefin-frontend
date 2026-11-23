import { FieldOfficer } from '../models/field-officer';
import { GeoPoint } from '../models/geo';
import { LiveStatus } from '../models/live-position';
import { AlertSeverity, AlertType, TrackingAlert } from '../models/tracking-alert';

/**
 * Reads the messages pushed on the live socket (`services/live-socket.service.ts`).
 *
 * The message shapes of the four topics (gps, motion, geofence, active-users) are not agreed with the backend yet, so these
 * readers accept the usual field names
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
    const s = v.trim();
    // A date-time with no zone is UTC: the GPS service sends e.g. "2026-11-18T05:28:56.262" for 10:58 IST (seen 18 Nov 2026).
    // The browser would read it as local time, 5½ hours off.
    const t = Date.parse(NO_ZONE.test(s) ? `${s.replace(' ', 'T')}Z` : s);
    return Number.isNaN(t) ? null : new Date(t).toISOString();
  }
  return null;
}

/** `yyyy-MM-ddTHH:mm[:ss[.fff…]]` without `Z` or an offset. */
const NO_ZONE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

const roundOrNull = (n: number | null) => (n === null ? null : Math.round(n));

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

const LIVE_STATUSES: LiveStatus[] = ['OnTask', 'AtBranch', 'Moving', 'Idle', 'Offline'];

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
    employeeId: str(field(o, 'employeeId', 'userId')) ?? employeeId,
    location,
    at,
    speedKmph,
    accuracyMeters: roundOrNull(num(field(o, 'accuracyMeters', 'accuracy', 'horizontalAccuracy'))),
    batteryPct,
    gpsEnabled: bool(gpsRaw),
    status: (statusRaw && LIVE_STATUSES.find((s) => norm(s) === norm(statusRaw))) || null,
    distanceTodayKm: num(field(o, 'distanceTodayKm', 'distanceKm')),
    mockLocation: bool(field(o, 'isMockLocation', 'mockLocation', 'isMock')),
  };
}

/** The array a message carries: the message itself, or the first list among `names` (in it or its envelope). */
function listOf(body: unknown, ...names: string[]): unknown[] | null {
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return null;
    }
  }
  if (Array.isArray(body)) return body;
  const o = unwrap(body);
  const list = field(o, ...names);
  return Array.isArray(list) ? list : null;
}

/**
 * The GPS fixes in a `/gps` message: one fix, a list of fixes, or a batch `{ userId, locations: [...] }` (the shape the phone
 * uploads). The batch's `userId` / `employeeId` applies to each fix that has none.
 */
export function readGpsFixes(employeeId: string, body: unknown, receivedAt: string): LiveGpsFix[] {
  const list = listOf(body, 'locations', 'points', 'positions', 'items', 'fixes');
  if (!list) {
    const fix = readGpsFix(employeeId, body, receivedAt);
    return fix ? [fix] : [];
  }
  const owner = Array.isArray(body) ? employeeId : (str(field(unwrap(body), 'employeeId', 'userId')) ?? employeeId);
  return list
    .map((item) => readGpsFix(owner, item, receivedAt))
    .filter((f): f is LiveGpsFix => !!f)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

/** Backend motion / roster states → `LiveStatus` (letters only, lower case). */
const MOTION_STATUS: Record<string, LiveStatus> = {
  moving: 'Moving',
  stopped: 'Idle',
  stationary: 'Idle',
  idle: 'Idle',
  ontask: 'OnTask',
  offline: 'Offline',
  // GPS off, not punched in and punched out are shown as Offline.
  gpsoff: 'Offline',
  notpunchedin: 'Offline',
  punchedout: 'Offline',
  atbranch: 'AtBranch',
};

function readStatus(v: unknown): LiveStatus | null {
  const s = str(v);
  if (!s) return null;
  return MOTION_STATUS[norm(s)] ?? LIVE_STATUSES.find((x) => norm(x) === norm(s)) ?? null;
}

/** One state change pushed on `/motion`. */
export interface LiveMotion {
  employeeId: string;
  status: LiveStatus;
  /** As sent, e.g. `ON_TASK`. */
  motion: string;
  /** When the new state began (ISO); the receive time when the message has none. */
  at: string;
  location: GeoPoint | null;
}

/**
 * The state change in a `/motion` message, or null when it names no state the web knows. Read like the GPS service's
 * `GET /api/v1/motion` record: `{ employeeId, motion, startedAt, endedAt, latitude, longitude, source }`.
 */
export function readMotion(employeeId: string, body: unknown, receivedAt: string): LiveMotion | null {
  const o = unwrap(body);
  const raw = str(field(o, 'motion', 'motionState', 'motionStatus', 'state', 'status', 'newState', 'toState', 'currentState'));
  const status = readStatus(raw);
  if (!raw || !status) return null;
  return {
    employeeId: str(field(o, 'employeeId', 'userId')) ?? employeeId,
    status,
    motion: raw,
    at: instant(field(o, 'startedAt', 'changedAt', 'since', 'timestamp', 'time', 'at', 'createdAt')) ?? receivedAt,
    location: readPoint(o),
  };
}

/**
 * One motion period from the GPS service (`GET /api/v1/motion?employeeId=` = today's, `POST /api/v1/motion/history`
 * `{ employeeId, date }` = a given day): `{ employeeId, motion, startedAt, endedAt, latitude, longitude, source }`.
 */
export interface MotionSegment {
  employeeId: string;
  status: LiveStatus;
  /** As sent, e.g. `STOPPED`. */
  motion: string;
  /** ISO. */
  from: string;
  /** ISO; null while it is still going on. */
  to: string | null;
  /** As sent. Not used to place anything: on 19 Nov 2026 the `MOVING` records had latitude and longitude swapped. */
  location: GeoPoint | null;
}

/**
 * The motion periods in a GPS-service response, oldest first. Records with the same start and state are sent twice for some
 * periods (seen 19 Nov 2026); the one that ends last (or is still open) is kept.
 */
export function readMotionSegments(employeeId: string, body: unknown): MotionSegment[] {
  const list = listOf(body, 'items', 'motions', 'records') ?? [];
  const byStart = new Map<string, MotionSegment>();
  for (const item of list) {
    const m = readMotion(employeeId, item, '');
    if (!m || !m.at) continue;
    const to = instant(field(unwrap(item), 'endedAt', 'endAt', 'until', 'finishedAt'));
    const seg: MotionSegment = { employeeId: m.employeeId, status: m.status, motion: m.motion, from: m.at, to, location: m.location };
    const key = `${seg.from}|${seg.status}`;
    const prev = byStart.get(key);
    if (!prev || (prev.to !== null && (seg.to === null || Date.parse(seg.to) > Date.parse(prev.to)))) byStart.set(key, seg);
  }
  return [...byStart.values()].sort((a, b) => Date.parse(a.from) - Date.parse(b.from));
}

export type GeofenceEvent = 'Enter' | 'Exit' | 'Change';

/** One task-geofence event pushed on `/geofence`. */
export interface LiveGeofence {
  employeeId: string;
  event: GeofenceEvent;
  /** As sent, e.g. `ENTER`. */
  rawEvent: string;
  taskId: string | null;
  taskTitle: string | null;
  jobId: string | null;
  jobNo: string | null;
  at: string;
  location: GeoPoint | null;
}

function readGeofenceEvent(raw: string): GeofenceEvent {
  const s = norm(raw);
  if (['enter', 'entered', 'entry', 'in', 'inside', 'arrived', 'arrive'].includes(s)) return 'Enter';
  if (['exit', 'exited', 'out', 'outside', 'left', 'leave', 'departed'].includes(s)) return 'Exit';
  return 'Change';
}

/** The event in a `/geofence` message (enter / exit / change of a task geofence). */
export function readGeofence(employeeId: string, body: unknown, receivedAt: string): LiveGeofence | null {
  const o = unwrap(body);
  const raw = str(field(o, 'event', 'eventType', 'transition', 'geofenceEvent', 'action', 'type', 'state', 'status'));
  if (!raw) return null;
  return {
    employeeId: str(field(o, 'employeeId', 'userId')) ?? employeeId,
    event: readGeofenceEvent(raw),
    rawEvent: raw,
    taskId: str(field(o, 'taskId')),
    taskTitle: str(field(o, 'taskTitle', 'taskName')),
    jobId: str(field(o, 'jobId')),
    jobNo: str(field(o, 'jobNo', 'jobCode')),
    at: instant(field(o, 'occurredAt', 'eventTime', 'timestamp', 'time', 'at', 'changedAt', 'createdAt')) ?? receivedAt,
    location: readPoint(o),
  };
}

/** One person in an `/active-users` message. */
export interface LiveRosterEntry {
  employeeId: string;
  /** Null when the message only says who is active. */
  status: LiveStatus | null;
  location: GeoPoint | null;
  /** Time of the position (`lastGpsTime`), else of the update. */
  at: string | null;
}

/**
 * What an `/active-users` message holds. Seen 23 Nov 2026: **one person per message**, about every 5 minutes each,
 * `{ employeeId, motion, taskId, taskName, latitude, longitude, lastGpsTime, updatedAt }`. A list of everyone active is
 * still read, in case the server sends one.
 */
export interface LiveRosterUpdate {
  /** true = a list of everyone active (someone missing is offline); false = one person's news, merged with what is known. */
  full: boolean;
  entries: LiveRosterEntry[];
}

/** The people in an `/active-users` message, or null when it names nobody the web can read. */
export function readActiveUsers(body: unknown): LiveRosterUpdate | null {
  const list = listOf(body, 'activeUsers', 'users', 'employees', 'roster', 'items', 'active');
  if (list) return { full: true, entries: list.map(readRosterEntry).filter((e): e is LiveRosterEntry => !!e) };
  const one = readRosterEntry(unwrap(body));
  return one ? { full: false, entries: [one] } : null;
}

/** One entry: an id, or an object with `employeeId` / `userId` / `id`, an optional state and position. */
function readRosterEntry(item: unknown): LiveRosterEntry | null {
  if (typeof item === 'string') return item.trim() ? { employeeId: item.trim(), status: null, location: null, at: null } : null;
  if (!isObj(item)) return null;
  const id = str(field(item, 'employeeId', 'userId', 'id'));
  if (!id) return null;
  return {
    employeeId: id,
    status: readStatus(field(item, 'motion', 'status', 'state', 'motionState')),
    location: readPoint(item),
    at: instant(field(item, 'lastGpsTime', 'lastSeenAt', 'gpsTime', 'updatedAt', 'since', 'startedAt', 'timestamp', 'at')),
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
 * An alarm message as a `TrackingAlert` (status Open). Not used since `/alarms` was replaced by `/motion` (19 Nov 2026); kept
 * until the backend says where alarms are pushed now. Employee name, role and branch come from the message
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
      branchId: str(field(o, 'branchId', 'organizationUnitId', 'organisationUnitId')) ?? officer?.organizationUnitId ?? '',
      branchName: str(field(o, 'branchName', 'organizationUnitName', 'organisationUnitName')) ?? officer?.organizationUnitName ?? '',
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
