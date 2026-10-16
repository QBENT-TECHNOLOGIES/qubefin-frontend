/** A WGS-84 coordinate. Field names match google.maps.LatLngLiteral so values can be passed straight to the map. */
export interface GeoPoint {
  lat: number;
  lng: number;
}

/** Lightweight branch record used for filters and the 30 km radius overlay. */
export interface TrackingBranch {
  id: string;
  name: string;
  code: string;
  /** Org hierarchy: Head Office > Division > Area > Branch. */
  areaName: string;
  divisionName: string;
  location: GeoPoint | null;
  /** Allowed operating radius around the branch, in kilometres (default 30). */
  operatingRadiusKm: number;
}

export interface PagedResult<T> {
  items: T[];
  totalRecords: number;
}

export type SortDirection = 'asc' | 'desc';
