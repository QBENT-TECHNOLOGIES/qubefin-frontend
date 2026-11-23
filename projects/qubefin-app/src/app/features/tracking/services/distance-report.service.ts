import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { AuthStore, ENV_CONFIG } from 'qubefin-core';
import { Observable } from 'rxjs';
import { DailyDistanceByEmployeesRequest, DailyDistanceReportRequest, DailyDistanceReportResponse } from '../models/distance-report';

/**
 * Daily distance report from the GPS service (Tracking → Tracking Report):
 * - `POST /api/v1/reports`: the caller and everyone in their organizational scope;
 * - `POST /api/v1/reports/by-employees`: only the chosen employees (`employeeIds`, at least one).
 *
 * Like `GpsHistoryService`, this server is not behind the gateway: the call skips the app's interceptors and sends the
 * access token itself; errors are shown on the page (`gpsServiceError`), not as a popup.
 */
@Injectable({ providedIn: 'root' })
export class DistanceReportService {
  private readonly http = new HttpClient(inject(HttpBackend));
  private readonly auth = inject(AuthStore);
  private readonly baseUrl: string = (inject(ENV_CONFIG, { optional: true })?.gpsServiceUrl ?? '').replace(/\/+$/, '');

  /** False when no `gpsServiceUrl` is configured. */
  readonly enabled = !!this.baseUrl;

  /** Everyone in the caller's scope. */
  dailyDistance(body: DailyDistanceReportRequest): Observable<DailyDistanceReportResponse> {
    return this.http.post<DailyDistanceReportResponse>(`${this.baseUrl}/api/v1/reports`, body, { headers: this.headers() });
  }

  /** Only the given employees. */
  dailyDistanceByEmployees(body: DailyDistanceByEmployeesRequest): Observable<DailyDistanceReportResponse> {
    return this.http.post<DailyDistanceReportResponse>(`${this.baseUrl}/api/v1/reports/by-employees`, body, { headers: this.headers() });
  }

  private headers() {
    return { Authorization: `Bearer ${this.auth.accessToken() ?? ''}` };
  }
}
