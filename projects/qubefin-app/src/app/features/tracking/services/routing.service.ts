import { Injectable, inject } from '@angular/core';
import { GeoPoint } from '../models/geo';
import { MapsLoaderService } from './maps-loader.service';

export type RouteTravelMode = 'TWO_WHEELER' | 'DRIVING';

/** The Routes API takes at most 25 intermediate stops per request. */
export const MAX_ROUTE_STOPS = 25;

export interface PlannedRouteLeg {
  distanceMeters: number;
  durationSeconds: number;
}

export interface PlannedRoute {
  /** Road path from origin through the stops to the destination. */
  path: GeoPoint[];
  distanceMeters: number;
  durationSeconds: number;
  /** Indices into the `stops` passed in, in visiting order. */
  order: number[];
  /** Origin → 1st stop, …, last stop → destination. */
  legs: PlannedRouteLeg[];
  /** Two-wheeler unless Google had no two-wheeler route here (then driving). */
  travelMode: RouteTravelMode;
  /** Stops left out because one request takes at most 25. */
  skipped: number;
}

export interface PlanOptions {
  /** Where the trip ends; defaults to the origin (round trip). */
  destination?: GeoPoint | null;
  /** Let Google choose the best order of the stops (default true). */
  optimize?: boolean;
  travelMode?: RouteTravelMode;
}

const round = (p: GeoPoint) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;

/**
 * Road routes with the Routes API (Maps JavaScript `Route` class, library "routes").
 * Needs **Routes API** enabled on the same key as the map. Results are cached per set of points,
 * so re-opening the same plan costs nothing. Two-wheeler routes are a Google beta: screens must show a warning.
 */
@Injectable({ providedIn: 'root' })
export class RoutingService {
  private readonly maps = inject(MapsLoaderService);
  private readonly cache = new Map<string, Promise<PlannedRoute>>();

  plan(origin: GeoPoint, stops: GeoPoint[], opts: PlanOptions = {}): Promise<PlannedRoute> {
    const used = stops.slice(0, MAX_ROUTE_STOPS);
    const destination = opts.destination ?? origin;
    const optimize = (opts.optimize ?? true) && used.length > 1;
    const mode = opts.travelMode ?? 'TWO_WHEELER';
    const key = [mode, optimize, round(origin), round(destination), ...used.map(round)].join('|');
    let hit = this.cache.get(key);
    if (!hit) {
      hit = this.compute(origin, destination, used, optimize, mode).then((r) => ({ ...r, skipped: stops.length - used.length }));
      this.cache.set(key, hit);
      hit.catch(() => this.cache.delete(key));
    }
    return hit;
  }

  private async compute(origin: GeoPoint, destination: GeoPoint, stops: GeoPoint[], optimize: boolean, mode: RouteTravelMode) {
    await this.maps.load();
    const { Route } = (await google.maps.importLibrary('routes')) as google.maps.RoutesLibrary;
    const fields = ['path', 'distanceMeters', 'durationMillis', 'legs'];
    if (optimize) fields.push('optimizedIntermediateWaypointIndices');

    const run = async (travelMode: RouteTravelMode) => {
      const { routes } = await Route.computeRoutes({
        origin,
        destination,
        intermediates: stops.map((location) => ({ location })),
        travelMode,
        optimizeWaypointOrder: optimize,
        region: 'in',
        fields,
      });
      return routes?.[0] ?? null;
    };

    let used: RouteTravelMode = mode;
    let route: google.maps.routes.Route | null = null;
    try {
      route = await run(mode);
    } catch (err) {
      if (mode !== 'TWO_WHEELER') throw this.explain(err);
    }
    if (!route && mode === 'TWO_WHEELER') {
      used = 'DRIVING';
      try {
        route = await run('DRIVING');
      } catch (err) {
        throw this.explain(err);
      }
    }
    if (!route) throw new Error('Google found no road route between these points.');

    return {
      path: (route.path ?? []).map((p) => ({ lat: p.lat, lng: p.lng })),
      distanceMeters: route.distanceMeters ?? 0,
      durationSeconds: Math.round((route.durationMillis ?? 0) / 1000),
      order: route.optimizedIntermediateWaypointIndices?.length ? route.optimizedIntermediateWaypointIndices : stops.map((_, i) => i),
      legs: (route.legs ?? []).map((l) => ({ distanceMeters: l.distanceMeters ?? 0, durationSeconds: Math.round((l.durationMillis ?? 0) / 1000) })),
      travelMode: used,
    };
  }

  private explain(err: unknown): Error {
    const msg = err instanceof Error ? err.message : String(err);
    if (/not authorized|API_KEY|PERMISSION_DENIED|REQUEST_DENIED|403/i.test(msg)) {
      return new Error('Google refused the route request. Check that the Routes API is enabled and allowed for this key.');
    }
    return new Error(`Route could not be calculated (${msg}).`);
  }
}

/** "2 h 05 m" / "45 m". */
export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  const h = Math.floor(mins / 60);
  return h ? `${h} h ${(mins % 60).toString().padStart(2, '0')} m` : `${mins} m`;
}

export const TRAVEL_MODE_LABEL: Record<RouteTravelMode, string> = {
  TWO_WHEELER: 'two-wheeler',
  DRIVING: 'car (no two-wheeler route here)',
};
