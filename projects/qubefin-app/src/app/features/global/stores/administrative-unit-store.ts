import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { AdministrativeUnitTreeNode } from '../models/administrative-unit-tree-node';
import { AdministrativeUnit } from '../models/administrative-unit';

@Injectable({
  providedIn: 'root',
})
export class AdministrativeUnitStore {
  // Internal State
  private readonly administrativeUnitId = signal<string | undefined>(undefined);

  // All Administrative Units as Tree
  administrativeUnitTreeResource = httpResource<AdministrativeUnitTreeNode[]>(
    () => `${ApiPaths.GLOBAL}/administrative-units/tree`,
  );

  readonly administrativeUnitTree = computed(
    () => this.administrativeUnitTreeResource.value() ?? [],
  );
  readonly loading = computed(() => this.administrativeUnitTreeResource.isLoading());
  readonly error = computed(() => this.administrativeUnitTreeResource.error());

  // Single Administrative Unit
  private readonly administrativeUnitResource = httpResource<AdministrativeUnit>(() => {
    const id = this.administrativeUnitId();
    if (!id || id === EMPTY_UUID) return undefined;
    return `${ApiPaths.GLOBAL}/administrative-units/${id}`;
  });

  readonly administrativeUnit = computed(
    () => this.administrativeUnitResource.value() ?? undefined,
  );
  readonly administrativeUnitLoading = computed(() => this.administrativeUnitResource.isLoading());
  readonly administrativeUnitError = computed(() => this.administrativeUnitResource.error());

  // Actions
  setAdministrativeUnitId(administrativeUnitId: string | undefined) {
    //if (this.administrativeUnitId() === administrativeUnitId) return;
    this.administrativeUnitId.set(administrativeUnitId);
  }

  // Manual Refresh
  refreshTree() {
    this.administrativeUnitTreeResource.reload();
  }
  refreshAdministrativeUnit() {
    this.administrativeUnitResource.reload();
  }
  refreshAll() {
    this.administrativeUnitTreeResource.reload();
    this.administrativeUnitResource.reload();
  }
}
