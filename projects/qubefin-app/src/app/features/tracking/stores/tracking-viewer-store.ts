import { HttpContext, httpResource } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { ApiPaths, AuthStore } from 'qubefin-core';
import { SKIP_ERROR_ALERT } from '../../../interceptors/http-error.interceptor';
import { TrackingViewer } from '../models/field-officer';
import { toTrackingViewer } from '../utils/tracking-api-adapters';

/**
 * The signed-in user as tracking sees them (A1, GET tracking-api/me): role, unit and branch scope.
 *
 * Loaded as soon as there is a valid access token (the header injects this store, so that is right after login), loaded
 * again when another user logs in on the same tab, and cleared on logout. Users without tracking access may get an error
 * here; that is expected, so no error popup is shown and `viewer` stays null.
 */
@Injectable({ providedIn: 'root' })
export class TrackingViewerStore {
  private readonly auth = inject(AuthStore);

  private readonly resource = httpResource<TrackingViewer>(
    () => {
      const token = this.auth.accessToken(); // read so a new login (new token) fetches again
      if (!token || !this.auth.isAuthenticated()) return undefined;
      return { url: `${ApiPaths.TRACKING}/me`, context: new HttpContext().set(SKIP_ERROR_ALERT, true) };
    },
    { parse: toTrackingViewer },
  );

  readonly viewer = computed<TrackingViewer | null>(() => (this.resource.hasValue() ? this.resource.value() : null));
  readonly loading = computed(() => this.resource.isLoading());
  readonly error = computed(() => this.resource.error());

  refresh() {
    this.resource.reload();
  }
}
