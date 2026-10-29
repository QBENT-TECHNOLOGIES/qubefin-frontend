import { httpResource } from '@angular/common/http';
import { Injectable, computed } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { FieldOfficer, OfficerRole, TrackingViewer } from '../models/field-officer';
import { TrackingBranch } from '../models/geo';

/**
 * The signed-in user, plus the branches and field officers in their scope (cached for the session).
 * `officers` = the people below the user in their scope, i.e. whom they may give work to and monitor.
 */
@Injectable({ providedIn: 'root' })
export class TrackingLookupStore {
  private readonly viewerResource = httpResource<TrackingViewer>(() => `${ApiPaths.TRACKING}/me`);
  private readonly branchesResource = httpResource<TrackingBranch[]>(() => `${ApiPaths.TRACKING}/branches`);
  private readonly officersResource = httpResource<FieldOfficer[]>(() => `${ApiPaths.TRACKING}/field-officers`);

  readonly viewer = computed(() => this.viewerResource.value() ?? null);
  /** False until the viewer is known, and for a CO (nobody below them). */
  readonly canCreateJobs = computed(() => !!this.viewer()?.canCreateJobs);
  readonly branches = computed(() => this.branchesResource.value() ?? []);
  readonly officers = computed(() => this.officersResource.value() ?? []);
  readonly loading = computed(() => this.branchesResource.isLoading() || this.officersResource.isLoading());

  readonly branchById = computed(() => new Map(this.branches().map((b) => [b.id, b])));
  readonly officerById = computed(() => new Map(this.officers().map((o) => [o.id, o])));

  /** Officers grouped for <mat-optgroup>, managers last. */
  readonly officersByRole = computed(() => {
    const order: OfficerRole[] = ['CO', 'ABM', 'BM', 'AM', 'DM'];
    return order
      .map((role) => ({ role, officers: this.officers().filter((o) => o.role === role) }))
      .filter((g) => g.officers.length);
  });

  refresh() {
    this.viewerResource.reload();
    this.branchesResource.reload();
    this.officersResource.reload();
  }
}
