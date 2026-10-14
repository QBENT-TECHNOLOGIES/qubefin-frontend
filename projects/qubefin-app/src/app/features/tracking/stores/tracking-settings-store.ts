import { httpResource } from '@angular/common/http';
import { Injectable, computed } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { TrackingSettings } from '../models/tracking-settings';

@Injectable({ providedIn: 'root' })
export class TrackingSettingsStore {
  readonly settingsResource = httpResource<TrackingSettings>(() => `${ApiPaths.TRACKING}/settings`);

  readonly settings = computed(() => this.settingsResource.value());
  readonly loading = computed(() => this.settingsResource.isLoading());
  readonly error = computed(() => this.settingsResource.error());

  refresh() {
    this.settingsResource.reload();
  }
}
