import { httpResource } from '@angular/common/http';
import { Injectable, computed } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { FieldOfficer, OfficerRole } from '../models/field-officer';
import { TrackingBranch } from '../models/geo';

/** Branches and field officers in the current user's scope (cached for the session). */
@Injectable({ providedIn: 'root' })
export class TrackingLookupStore {
  private readonly branchesResource = httpResource<TrackingBranch[]>(() => `${ApiPaths.TRACKING}/branches`);
  private readonly officersResource = httpResource<FieldOfficer[]>(() => `${ApiPaths.TRACKING}/field-officers`);

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
    this.branchesResource.reload();
    this.officersResource.reload();
  }
}
