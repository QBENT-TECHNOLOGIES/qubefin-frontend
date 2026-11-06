import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { ENV_CONFIG } from 'qubefin-core';

/**
 * Answers `tracking-api/*` requests from an in-browser mock when `useTrackingMocks` is true in the environment;
 * everything else passes through untouched.
 *
 * Step-by-step integration: endpoints listed in `trackingLiveEndpoints` (e.g. `'GET me'`, `'GET jobs/{id}'`) go to the
 * real backend even while the mock is on. `{x}` matches one path segment; the query string is ignored.
 *
 * Register it LAST so the auth and error interceptors still run.
 * The mock itself is lazy-loaded, so production bundles only carry this small check.
 * Remove this interceptor (and the mocks folder) once the real tracking-api is live.
 */
export const trackingMockInterceptor: HttpInterceptorFn = (req, next) => {
  const env = inject(ENV_CONFIG);
  if (!env?.useTrackingMocks || !req.url.includes('tracking-api/')) return next(req);
  if (isLive(req, env.trackingLiveEndpoints)) return next(req);
  return from(import('./tracking-mock-backend')).pipe(switchMap((m) => m.handleMockRequest(req)));
};

const patternCache = new Map<string, { method: string; regex: RegExp }>();

function isLive(req: HttpRequest<unknown>, endpoints: readonly string[] | undefined): boolean {
  if (!endpoints?.length) return false;
  const path = req.url.split('tracking-api/')[1].split('?')[0].replace(/\/+$/, '');
  return endpoints.some((e) => {
    let p = patternCache.get(e);
    if (!p) {
      const [method, route = ''] = e.trim().split(/\s+/);
      const body = route.replace(/^\/+|\/+$/g, '').split('/').map((s) => (/^\{.+\}$/.test(s) ? '[^/]+' : s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('/');
      p = { method: method.toUpperCase(), regex: new RegExp(`^${body}$`) };
      patternCache.set(e, p);
    }
    return p.method === req.method && p.regex.test(path);
  });
}
