import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { AuthStore, ENV_CONFIG } from 'qubefin-core';
import { Observable, map } from 'rxjs';
import { toDateKey } from '../utils/geo-utils';
import { LiveGpsFix, readGpsFix } from '../utils/live-message';

/**
 * One fix as the GPS service returns it (`GET /api/v1/gps?employeeId=`). `speed` is read as m/s, `gpsTime` is the phone's
 * time of the fix (see `utils/live-message.ts`).
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
 * Today's GPS fixes of one employee from the GPS service (`environment.gpsServiceUrl`, the server behind the live socket).
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

  /** False when no `gpsServiceUrl` is configured: Live Tracking shows no trail. */
  readonly enabled = !!this.baseUrl;

  /** Today's fixes (local calendar day), oldest first, without points that have no usable position. */
  today(employeeId: string): Observable<LiveGpsFix[]> {
    return this.http
      .get<GpsServiceFix[]>(`${this.baseUrl}/api/v1/gps`, {
        params: { employeeId },
        headers: { Authorization: `Bearer ${this.auth.accessToken() ?? ''}` },
      })
      .pipe(map((body) => toTodayTrail(employeeId, body)));
  }
}

function toTodayTrail(employeeId: string, body: unknown): LiveGpsFix[] {
  const list: unknown[] = Array.isArray(body) ? body : [];
  const today = toDateKey();
  const receivedAt = new Date().toISOString();
  const fixes = list
    .map((x) => readGpsFix(employeeId, x, receivedAt))
    .filter((f): f is LiveGpsFix => !!f && toDateKey(new Date(f.at)) === today)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  // Same time twice (e.g. a retried upload) → keep one.
  return fixes.filter((f, i) => i === 0 || f.at !== fixes[i - 1].at);
}
