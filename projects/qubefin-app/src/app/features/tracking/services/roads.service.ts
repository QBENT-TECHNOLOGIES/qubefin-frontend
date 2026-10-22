import { Injectable, inject } from '@angular/core';
import { ENV_CONFIG } from 'qubefin-core';
import { GeoPoint } from '../models/geo';
import { RoadPathPoint } from '../models/live-position';
import { distanceMeters } from '../utils/geo-utils';

const ROADS_URL = 'https://roads.googleapis.com/v1/snapToRoads';
/** Roads API limit per request. */
const CHUNK = 100;
/** Fixes closer than this to the previous kept one add nothing (stationary jitter) and are skipped. */
const MIN_STEP_METERS = 10;
/** Google asks for consecutive points within ~300 m; beyond this the fixes are treated as a GPS gap. */
const MAX_GAP_METERS = 1000;

interface SnapResponse {
  snappedPoints?: { location: { latitude: number; longitude: number }; originalIndex?: number }[];
  error?: { message?: string; status?: string };
}

/**
 * Snaps a GPS trail to the roads actually travelled (Roads API, "Snap to Roads" with interpolation).
 * Needs **Roads API** enabled on the map key. Called with `fetch` (not HttpClient) so the app's
 * gateway prefix and bearer token are never sent to Google.
 *
 * Results are cached per key (employee + day). For a live day only the new fixes are snapped on each refresh.
 * The backend may instead return `EmployeeRoute.roadPath` (preferred: snapped once, shared by everyone).
 */
@Injectable({ providedIn: 'root' })
export class RoadsService {
  private readonly env = inject(ENV_CONFIG);
  private readonly cache = new Map<string, { count: number; path: RoadPathPoint[] }>();

  async snap(cacheKey: string, points: GeoPoint[]): Promise<RoadPathPoint[]> {
    const hit = this.cache.get(cacheKey);
    if (hit && hit.count === points.length) return hit.path;
    // Live day: snap from the last snapped fix onwards and append.
    const from = hit && hit.count < points.length ? Math.max(0, hit.count - 1) : 0;
    const fresh = await this.snapRange(points, from);
    const path = from > 0 && hit ? [...hit.path, ...fresh] : fresh;
    this.cache.set(cacheKey, { count: points.length, path });
    return path;
  }

  private async snapRange(points: GeoPoint[], from: number): Promise<RoadPathPoint[]> {
    const key: string | undefined = this.env?.MAP_API_KEY;
    if (!key) throw new Error('MAP_API_KEY is not set.');

    // Thin out stationary jitter, remembering which original fix each kept point is.
    const kept: { p: GeoPoint; index: number }[] = [];
    for (let i = from; i < points.length; i++) {
      const last = kept[kept.length - 1];
      if (!last || distanceMeters(last.p, points[i]) >= MIN_STEP_METERS || i === points.length - 1) kept.push({ p: points[i], index: i });
    }
    if (kept.length < 2) return kept.map((k) => ({ lat: k.p.lat, lng: k.p.lng, pointIndex: k.index }));

    // Split where GPS was lost (big jump): snapping across a gap would invent a road. The gap stays a straight line.
    const segments: { p: GeoPoint; index: number }[][] = [[kept[0]]];
    for (let i = 1; i < kept.length; i++) {
      if (distanceMeters(kept[i - 1].p, kept[i].p) > MAX_GAP_METERS) segments.push([]);
      segments[segments.length - 1].push(kept[i]);
    }
    // Within a segment, chunks of 100 that overlap by one point so the snapped line has no breaks.
    const jobs = segments.map((seg) => {
      if (seg.length < 2) return Promise.resolve(seg.map((k) => ({ lat: k.p.lat, lng: k.p.lng, pointIndex: k.index })));
      const chunks: { p: GeoPoint; index: number }[][] = [];
      for (let c = 0; c < seg.length - 1; c += CHUNK - 1) chunks.push(seg.slice(c, c + CHUNK));
      return Promise.all(chunks.map((c) => this.request(key, c))).then((res) => res.flatMap((r, i) => (i > 0 ? r.slice(1) : r)));
    });
    return (await Promise.all(jobs)).flat();
  }

  private async request(key: string, chunk: { p: GeoPoint; index: number }[]): Promise<RoadPathPoint[]> {
    const path = chunk.map((k) => `${k.p.lat.toFixed(6)},${k.p.lng.toFixed(6)}`).join('|');
    const url = `${ROADS_URL}?interpolate=true&path=${encodeURIComponent(path)}&key=${encodeURIComponent(key)}`;
    let res: Response;
    try {
      res = await fetch(url, { credentials: 'omit' });
    } catch {
      throw new Error('Could not reach the Roads API.');
    }
    const body = (await res.json().catch(() => ({}))) as SnapResponse;
    if (!res.ok || body.error) {
      throw new Error(
        res.status === 403
          ? 'Google refused the Roads request. Check that the Roads API is enabled and allowed for this key.'
          : `Roads API error: ${body.error?.message ?? res.statusText}`,
      );
    }
    // Interpolated points have no originalIndex: they belong to the last original fix before them.
    let current = chunk[0].index;
    return (body.snappedPoints ?? []).map((s) => {
      if (s.originalIndex != null) current = chunk[s.originalIndex]?.index ?? current;
      return { lat: s.location.latitude, lng: s.location.longitude, pointIndex: current };
    });
  }
}

/** Length of a path in km. */
export function pathKm(path: GeoPoint[]): number {
  let m = 0;
  for (let i = 1; i < path.length; i++) m += distanceMeters(path[i - 1], path[i]);
  return m / 1000;
}
