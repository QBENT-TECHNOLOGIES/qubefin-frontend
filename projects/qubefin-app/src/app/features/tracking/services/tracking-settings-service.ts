import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { TrackingSettings } from '../models/tracking-settings';

@Injectable({ providedIn: 'root' })
export class TrackingSettingsService {
  private readonly http = inject(HttpClient);

  save(settings: TrackingSettings) {
    return this.http.put<TrackingSettings>(`${ApiPaths.TRACKING}/settings`, settings);
  }
}
