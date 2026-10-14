import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { ENV_CONFIG } from 'qubefin-core';

/**
 * Answers every `tracking-api/*` request from an in-browser mock when `useTrackingMocks`
 * is true in the environment; everything else passes through untouched.
 * Register it LAST so the auth and error interceptors still run.
 * The mock itself is lazy-loaded, so production bundles only carry this small check.
 * Remove this interceptor (and the mocks folder) once the real tracking-api is live.
 */
export const trackingMockInterceptor: HttpInterceptorFn = (req, next) => {
  const env = inject(ENV_CONFIG);
  if (!env?.useTrackingMocks || !req.url.includes('tracking-api/')) return next(req);
  return from(import('./tracking-mock-backend')).pipe(switchMap((m) => m.handleMockRequest(req)));
};
