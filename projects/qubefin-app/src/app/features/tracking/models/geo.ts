/** A WGS-84 coordinate. Field names match google.maps.LatLngLiteral so values can be passed straight to the map. */
export interface GeoPoint {
  lat: number;
  lng: number;
}

/** Lightweight branch record used for filters and the 30 km radius overlay. */
/** A2, GET tracking-api/organization-units; names as the API sends them. */
export interface TrackingBranch {
  id: string;
  name: string;
  code: string;
  /** Org hierarchy: Head Office > Division > Area > Branch. */
  areaName: string;
  divisionName: string;
  location: GeoPoint | null;
  /**
   * Allowed operating radius around the branch. **In metres** despite the API name (30000 = 30 km); divide by 1000
   * when showing or comparing kilometres.
   */
  branchOperatingRadiusInKm: number;
}

/**
 * A group / centre for filters (`GET groups?branchId=&creditOfficerId=`). When a group is introduced in the system it is
 * mapped to a branch and a Credit Officer; each member is mapped to a group. The mapping is for filtering only: it does
 * not limit who can be given a task there.
 */
export interface TrackingGroup {
  id: string;
  code: string;
  name: string;
  branchId: string;
  branchName: string;
  /** Mapped Credit Officer (null if none is mapped yet). */
  creditOfficerId: string | null;
  creditOfficerName: string | null;
}

export interface PagedResult<T> {
  items: T[];
  totalRecords: number;
}

export type SortDirection = 'asc' | 'desc';
