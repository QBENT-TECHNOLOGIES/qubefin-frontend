import { GeoPoint } from './geo';

export type GeoTagKind = 'Branch' | 'GroupCentre' | 'Customer' | 'OdCustomer' | 'EmployeeHome';

export interface GeoTagChange {
  location: GeoPoint;
  radiusMeters: number;
  changedByName: string;
  changedAt: string;
  reason: string | null;
}

export interface GeoTag {
  id: string;
  kind: GeoTagKind;
  /** Id of the underlying entity (branch, group, customer, employee). */
  refId: string;
  name: string;
  /** Loan account no, group code, employee code, branch code… */
  refCode: string;
  branchId: string;
  branchName: string;
  address: string | null;
  location: GeoPoint | null;
  radiusMeters: number;
  /** Photo captured at tagging time (e.g. borrower + co-borrower in front of the residence). */
  photoUrl: string | null;
  verified: boolean;
  taggedByName: string | null;
  taggedAt: string | null;
  history: GeoTagChange[];
}

export interface GeoTagQuery {
  kind: GeoTagKind;
  searchText: string | null;
  branchId: string | null;
  /** true = only records still missing a geo-tag. */
  onlyUntagged: boolean;
}

export interface UpdateGeoTagRequest {
  location: GeoPoint;
  radiusMeters: number;
  reason: string;
}

/**
 * Light view of one geo-tagged place, for the task picker that loads a whole branch at once
 * (`GET geo-tags/points?branchId=&kinds=GroupCentre,Customer,OdCustomer`). Only places that have a location;
 * no photo or history. A member who is currently overdue is returned once, as `OdCustomer`.
 */
export interface GeoTagPoint {
  id: string;
  kind: GeoTagKind;
  refId: string;
  name: string;
  refCode: string;
  branchId: string;
  branchName: string;
  address: string | null;
  location: GeoPoint;
  radiusMeters: number;
  /** OD customers only (Loan Status Report): days past due. */
  dpd: number | null;
  /** OD customers only: overdue amount (₹). */
  overdueAmount: number | null;
}

export interface GeoTagPointsResponse {
  points: GeoTagPoint[];
  /** Per kind: places in the branch with no geo-tag yet (they cannot get a task). */
  untaggedByKind: Partial<Record<GeoTagKind, number>>;
}
