import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { AuthStore, ENV_CONFIG } from 'qubefin-core';
import { Observable, map } from 'rxjs';
import { toDateKey } from '../utils/geo-utils';
import { LiveGpsFix, MotionSegment, readGpsFix, readMotionSegments } from '../utils/live-message';

/**
 * One fix as the GPS service returns it (`GET /api/v1/gps?employeeId=`, `POST /api/v1/gps/history`). `speed` is read as m/s,
 * `gpsTime` is the phone's time of the fix, in UTC without a zone (see `utils/live-message.ts`). Sent newest first.
 */
export interface GpsServiceFix {
  id: string;
  gpsTime: string;
  locationId: string;
  userId: string;
  isMockLocation: boolean;
  batteryPercentage: number;
  receivedAt: string;
  courseDegree: number;
  speed: number;
  latitude: number;
  longitude: number;
  accuracy: number;
}

/**
 * GPS fixes and motion periods of one employee from the GPS service (`environment.gpsServiceUrl`, the server behind the live
 * socket): today's (`GET /api/v1/gps`, `GET /api/v1/motion`) and a given day's (`POST /api/v1/gps/history`,
 * `POST /api/v1/motion/history`, body `{ employeeId, date: "yyyy-MM-dd" }`). Only for people the caller may monitor; anyone else
 * (the caller included) answers 400 "You do not have permission to view this employee's …".
 *
 * This server is not behind the gateway, so the call skips the app's interceptors (they would put the gateway path in front
 * of the URL). It sends the access token itself as `Authorization: Bearer <token>`, and errors are shown on the screen, not
 * as a popup.
 */
@Injectable({ providedIn: 'root' })
export class GpsHistoryService {
  private readonly http = new HttpClient(inject(HttpBackend));
  private readonly auth = inject(AuthStore);
  private readonly baseUrl: string = (inject(ENV_CONFIG, { optional: true })?.gpsServiceUrl ?? '').replace(/\/+$/, '');

  /** False when no `gpsServiceUrl` is configured: Live Tracking shows no trail, Tracking History uses `employees/{id}/route`. */
  readonly enabled = !!this.baseUrl;

  /** Today's fixes (local calendar day), oldest first, without points that have no usable position. */
  today(employeeId: string): Observable<LiveGpsFix[]> {
    return this.http
      .get<GpsServiceFix[]>(`${this.baseUrl}/api/v1/gps`, { params: { employeeId }, headers: this.headers() })
      .pipe(map((body) => toDayTrail(employeeId, body, toDateKey())));
  }

  /** The fixes of one local day (`yyyy-MM-dd`), oldest first. */
  fixesOn(employeeId: string, date: string): Observable<LiveGpsFix[]> {
    return this.http
      .post<GpsServiceFix[]>(`${this.baseUrl}/api/v1/gps/history`, { employeeId, date }, { headers: this.headers() })
      .pipe(map((body) => toDayTrail(employeeId, body, date)));
  }

  /** Today's motion periods (MOVING / STOPPED / …), oldest first. The first may have started on an earlier day. */
  motionsToday(employeeId: string): Observable<MotionSegment[]> {
    return this.http
      .get<unknown>(`${this.baseUrl}/api/v1/motion`, { params: { employeeId }, headers: this.headers() })
      .pipe(map((body) => readMotionSegments(employeeId, body)));
  }

  /** The motion periods that overlap one day, oldest first (they may start before it or end after it). */
  motionsOn(employeeId: string, date: string): Observable<MotionSegment[]> {
    return this.http
      .post<unknown>(`${this.baseUrl}/api/v1/motion/history`, { employeeId, date }, { headers: this.headers() })
      .pipe(map((body) => readMotionSegments(employeeId, body)));
  }

  private headers() {
    return { Authorization: `Bearer ${this.auth.accessToken() ?? ''}` };
  }
}

/** The error text of a GPS-service call, for the screen (these calls skip the app's error popup). */
export function gpsServiceError(err: unknown): string {
  const body = (err as { error?: unknown })?.error;
  const message = typeof body === 'object' && body !== null ? (body as { message?: unknown }).message : null;
  if (typeof message === 'string' && message.trim()) return message.trim();
  return (err as { status?: number })?.status === 0 ? 'The GPS service cannot be reached.' : 'The GPS service could not load this data.';
}

function toDayTrail(employeeId: string, body: unknown, day: string): LiveGpsFix[] {
  const list: unknown[] = Array.isArray(body) ? body : [];
  const today = day;
  const receivedAt = new Date().toISOString();
  const fixes = list
    .map((x) => readGpsFix(employeeId, x, receivedAt))
    .filter((f): f is LiveGpsFix => !!f && toDateKey(new Date(f.at)) === today)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  // Same time twice (e.g. a retried upload) → keep one.
  return fixes.filter((f, i) => i === 0 || f.at !== fixes[i - 1].at);
}
