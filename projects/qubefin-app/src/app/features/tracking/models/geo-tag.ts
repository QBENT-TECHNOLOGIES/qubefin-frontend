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
