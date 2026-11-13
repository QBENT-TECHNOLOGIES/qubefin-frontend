import { httpResource } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { ApiPaths, AuthStore } from 'qubefin-core';
import { FieldOfficer, OfficerRole } from '../models/field-officer';
import { TrackingBranch } from '../models/geo';
import { TrackingViewerStore } from './tracking-viewer-store';

/**
 * The signed-in user, plus the branches and field officers in their scope (cached for the session).
 * `officers` = everyone the user may monitor (filters, Job Monitoring, Tracking History). `assignableOfficers` = the
 * subset they may give work to (Assign to / Transfer to). A BM monitors the ABM of their branch but cannot assign them.
 */
@Injectable({ providedIn: 'root' })
export class TrackingLookupStore {
  private readonly auth = inject(AuthStore);
  private readonly viewerStore = inject(TrackingViewerStore);

  /** URL only while signed in; reading the token makes a new login (another user on this tab) fetch again. */
  private signedIn(url: string): string | undefined {
    return this.auth.accessToken() && this.auth.isAuthenticated() ? url : undefined;
  }

  /** A2: contract `GET branches`, served by the backend as `organization-units`. */
  private readonly branchesResource = httpResource<TrackingBranch[]>(() =>
    this.signedIn(`${ApiPaths.TRACKING}/organization-units`),
  );
  /** A3: everyone the caller may monitor (`canAssign` = may also give them work). Optional filter: `?organizationUnitId=`. */
  private readonly officersResource = httpResource<FieldOfficer[]>(() => this.signedIn(`${ApiPaths.TRACKING}/field-officers`));

  /** The signed-in user (from app-api/users/login-info), see `TrackingViewerStore`. */
  readonly viewer = this.viewerStore.viewer;
  /** False until the viewer is known, and for a CO (nobody below them). */
  readonly canCreateJobs = computed(() => !!this.viewer()?.canCreateJobs);
  readonly branches = computed(() => this.branchesResource.value() ?? []);
  readonly officers = computed(() => this.officersResource.value() ?? []);
  readonly loading = computed(() => this.branchesResource.isLoading() || this.officersResource.isLoading());

  readonly branchById = computed(() => new Map(this.branches().map((b) => [b.id, b])));
  readonly officerById = computed(() => new Map(this.officers().map((o) => [o.id, o])));

  readonly assignableOfficers = computed(() => this.officers().filter((o) => o.canAssign));
  /** Officers grouped for <mat-optgroup>, managers last: everyone the user may monitor (filters). */
  readonly officersByRole = computed(() => groupByRole(this.officers()));
  /** Same, only people the user may give work to (Assign to / Transfer to). */
  readonly assignableByRole = computed(() => groupByRole(this.assignableOfficers()));

  refresh() {
    this.viewerStore.refresh();
    this.branchesResource.reload();
    this.officersResource.reload();
  }
}

/** Groups for <mat-optgroup>: tracking roles lowest first, then any other role the API sends (alphabetical), so nobody is dropped. */
function groupByRole(officers: FieldOfficer[]) {
  const known: OfficerRole[] = ['Credit Officer', 'Assistant Branch Manager', 'Branch Manager', 'Area Manager', 'Divisional Manager'];
  const others = [...new Set(officers.map((o) => o.role))].filter((r) => !known.includes(r)).sort();
  return [...known, ...others].map((role) => ({ role, officers: officers.filter((o) => o.role === role) })).filter((g) => g.officers.length);
}
