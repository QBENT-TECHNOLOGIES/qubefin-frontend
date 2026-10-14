import { GeoPoint } from '../models/geo';

const EARTH_RADIUS_M = 6_371_000;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in metres (haversine). */
export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Point at `meters` from `origin` in direction `bearingDeg` (0 = north). */
export function offsetPoint(origin: GeoPoint, meters: number, bearingDeg: number): GeoPoint {
  const d = meters / EARTH_RADIUS_M;
  const brg = toRad(bearingDeg);
  const lat1 = toRad(origin.lat);
  const lng1 = toRad(origin.lng);
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brg));
  const lng2 =
    lng1 + Math.atan2(Math.sin(brg) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: +((lat2 * 180) / Math.PI).toFixed(6), lng: +((lng2 * 180) / Math.PI).toFixed(6) };
}

/** "45 m", "1.2 km". */
export function formatDistance(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || Number.isNaN(meters)) return '–';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 10_000 ? 2 : 1)} km`;
}

export function formatCoords(p: GeoPoint | null | undefined): string {
  return p ? `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}` : '–';
}

/** Local yyyy-MM-dd for a Date (not UTC, so "today" matches the user's clock). */
export function toDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Bounds-fitting helper: returns the centre of a set of points (or the fallback). */
export function centroid(points: GeoPoint[], fallback: GeoPoint): GeoPoint {
  if (!points.length) return fallback;
  const sum = points.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 });
  return { lat: sum.lat / points.length, lng: sum.lng / points.length };
}

/** Google Maps directions link (opens in a new tab, no API key needed). */
export function googleMapsLink(p: GeoPoint): string {
  return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
}

/** Minutes between two ISO timestamps (b - a), or null. */
export function minutesBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60_000);
}

/** Default map centre when nothing else is known (Kolkata). */
export const DEFAULT_CENTER: GeoPoint = { lat: 22.5726, lng: 88.3639 };
