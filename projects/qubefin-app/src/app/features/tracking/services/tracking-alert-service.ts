import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { ResolveAlertRequest, TrackingAlert } from '../models/tracking-alert';

/** Write actions on tracking alerts. (Named to avoid clashing with qubefin-core's AlertService popups.) */
@Injectable({ providedIn: 'root' })
export class TrackingAlertService {
  private readonly http = inject(HttpClient);
  private readonly basePath = `${ApiPaths.TRACKING}/alerts`;

  acknowledge(alertId: string) {
    return this.http.put<TrackingAlert>(`${this.basePath}/${alertId}/acknowledge`, {});
  }

  resolve(alertId: string, req: ResolveAlertRequest) {
    return this.http.put<TrackingAlert>(`${this.basePath}/${alertId}/resolve`, req);
  }
}
