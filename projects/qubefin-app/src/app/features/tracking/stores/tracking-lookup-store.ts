import { httpResource } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
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
  private readonly viewerStore = inject(TrackingViewerStore);
  private readonly branchesResource = httpResource<TrackingBranch[]>(() => `${ApiPaths.TRACKING}/branches`);
  private readonly officersResource = httpResource<FieldOfficer[]>(() => `${ApiPaths.TRACKING}/field-officers`);

  /** The signed-in user (GET me), loaded at login by `TrackingViewerStore`. */
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

function groupByRole(officers: FieldOfficer[]) {
  const order: OfficerRole[] = ['CO', 'ABM', 'BM', 'AM', 'DM'];
  return order.map((role) => ({ role, officers: officers.filter((o) => o.role === role) })).filter((g) => g.officers.length);
}
