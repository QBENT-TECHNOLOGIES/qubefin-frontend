import { GeoPoint } from './geo';

export type GeoTagKind = 'Branch' | 'GroupCentre' | 'Member' | 'OdMember' | 'EmployeeHome';

export interface GeoTagChange {
  location: GeoPoint;
  radiusMeters: number;
  changedByName: string;
  changedAt: string;
  reason: string | null;
}

/**
 * One row of the Geo Tags page (E1, `GET tracking-api/geo-tags?kind=&searchText=&organisationUnitId=&onlyUntagged=`; names as
 * the API sends them). There is no separate geo-tag id: `refId` (the branch, group, member or employee) identifies it.
 */
export interface GeoTag {
  kind: GeoTagKind;
  /** Id of the underlying entity (branch, group, member, employee); also the row's key. */
  refId: string;
  name: string;
  /** Loan account no, group code, employee code, branch code… */
  refCode: string;
  branchId: string;
  branchName: string;
  address: string | null;
  location: GeoPoint | null;
  /** Match radius in metres; for a `Branch` the operating radius in metres. */
  radiusMeters: number;
  /** Photo captured at tagging time (e.g. borrower + co-borrower in front of the residence). */
  photoUrl: string | null;
  /** Contract rule 3.2.13; **not sent by E1 yet** (13 Nov 2026). While absent the page shows no verification state. */
  verified?: boolean;
  taggedByName: string | null;
  taggedAt: string | null;
  /** Location changes; **not sent by E1 yet** (13 Nov 2026). */
  history?: GeoTagChange[];
}

export interface UpdateGeoTagRequest {
  location: GeoPoint;
  radiusMeters: number;
  reason: string;
}

/**
 * Light view of one geo-tagged place, for the task picker that loads a whole branch at once
 * (B5, `GET geo-tags/points?organisationUnitId=&kinds=GroupCentre,Member,OdMember`; organisationUnitId required; names as the API sends them). Only places that have a location;
 * no photo or history. A member who is currently overdue is returned once, as `OdMember`.
 */
export interface GeoTagPoint {
  id: string;
  kind: GeoTagKind;
  refId: string;
  name: string;
  refCode: string;
  organisationUnitId: string;
  branchName: string;
  address: string | null;
  location: GeoPoint;
  /** Match radius a task at this place gets (arrival / completion photo must be within it). */
  taskLocationMatchInMeters: number;
  /**
   * The geo-tag has been verified (done from the mobile app). Groups, members and OD members whose location is not
   * verified are shown with a "Location Not Verified" badge in the task picker and cannot be put in a job until they are.
   */
  verified: boolean;
  /**
   * Mapped Credit Officer of the group / member (set when it was introduced in the system); null for other kinds or
   * when none is mapped. **Filter only**: anyone allowed by the job rules can still be given a task here.
   */
  creditOfficerId: string | null;
  creditOfficerName: string | null;
  /** Members and OD members: the group they are mapped to (null for groups and other kinds). */
  groupId: string | null;
  groupName: string | null;
  /** OD members only (Loan Status Report): days past due. */
  dpd: number | null;
  /** OD members only: overdue amount (₹). */
  overdueAmount: number | null;
  /** Who captured the location (mobile app) and when. */
  taggedByName: string | null;
  taggedAt: string | null;
}

export interface GeoTagPointsResponse {
  points: GeoTagPoint[];
  /** Per kind: places in the branch with no geo-tag yet (they cannot get a task). */
  untaggedByKind: Partial<Record<GeoTagKind, number>>;
}
