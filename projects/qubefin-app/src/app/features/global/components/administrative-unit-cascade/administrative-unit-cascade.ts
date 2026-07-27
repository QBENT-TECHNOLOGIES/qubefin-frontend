import { CommonModule } from '@angular/common';
import { Component, HostBinding, effect, inject, input, output, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { LucideDynamicIcon } from '@lucide/angular';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { AdministrativeUnitStore } from '../../stores/administrative-unit-store';
import { AdministrativeUnitTreeNode } from '../../models/administrative-unit-tree-node';

@Component({
  selector: 'qfin-administrative-unit-cascade',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatSelectModule,
    LucideDynamicIcon,
    MatButtonToggleModule,
  ],
  templateUrl: './administrative-unit-cascade.html',
  styles: ``,
})
export class AdministrativeUnitCascade {
  // ────────────────────────────────────────────────
  // Inputs / Outputs
  // ────────────────────────────────────────────────

  columns = input<1 | 2 | 3 | 4>(3);
  administrativeUnitId = input<string>('');
  disabled = input<boolean>(false);
  selectedIdChanged = output<string>();

  // ────────────────────────────────────────────────
  // Host bindings — grid column span based on `columns`
  // ────────────────────────────────────────────────

  @HostBinding('class.md:col-span-1')
  get span1(): boolean {
    return this.columns() === 1;
  }

  @HostBinding('class.md:col-span-2')
  get span2(): boolean {
    return this.columns() === 2;
  }

  @HostBinding('class.md:col-span-3')
  get span3(): boolean {
    return this.columns() === 3;
  }

  @HostBinding('class.md:col-span-4')
  get span4(): boolean {
    return this.columns() === 4;
  }

  // ────────────────────────────────────────────────
  // Dependencies / static data
  // ────────────────────────────────────────────────

  private readonly administrativeUnitStore = inject(AdministrativeUnitStore);
  readonly tree = this.administrativeUnitStore.administrativeUnitTree;
  readonly iconMap = APP_ICONS_MAP;

  // ────────────────────────────────────────────────
  // Internal restore-tracking state
  // ────────────────────────────────────────────────

  /**
   * Id that we last SUCCESSFULLY restored a selection for.
   * Only set once `restoreSelection` confirms the node was found —
   * otherwise a late-arriving `tree()` update would be skipped forever.
   */
  private lastRestoredId: string | null = null;

  /**
   * True while we are programmatically driving the cascade
   * (restoring from an id, or switching Rural/Urban mode).
   * Used to suppress `selectedIdChanged` emissions caused by our
   * own internal `onXChange` calls.
   */
  private restoring = false;

  // ────────────────────────────────────────────────
  // Mode (Rural vs Urban) — determines which branch of the
  // cascade (Block/GP/Village vs Municipality/Ward) is shown
  // ────────────────────────────────────────────────

  readonly mode = signal<'Rural' | 'Urban'>('Rural');

  // ────────────────────────────────────────────────
  // Option lists for each level of the cascade
  // ────────────────────────────────────────────────

  countryList = signal<AdministrativeUnitTreeNode[]>([]);
  stateList = signal<AdministrativeUnitTreeNode[]>([]);
  districtList = signal<AdministrativeUnitTreeNode[]>([]);

  blockList = signal<AdministrativeUnitTreeNode[]>([]);
  municipalityList = signal<AdministrativeUnitTreeNode[]>([]);

  gramPanchayatList = signal<AdministrativeUnitTreeNode[]>([]);
  wardList = signal<AdministrativeUnitTreeNode[]>([]);

  villageList = signal<AdministrativeUnitTreeNode[]>([]);

  // ────────────────────────────────────────────────
  // Currently selected id at each level
  // ────────────────────────────────────────────────

  selectedCountry = signal<string | null>(null);
  selectedState = signal<string | null>(null);
  selectedDistrict = signal<string | null>(null);

  selectedBlock = signal<string | null>(null);
  selectedMunicipality = signal<string | null>(null);

  selectedGramPanchayat = signal<string | null>(null);
  selectedWard = signal<string | null>(null);

  selectedVillage = signal<string | null>(null);

  // ────────────────────────────────────────────────
  // Constructor — single effect that reacts to tree loads
  // and to `administrativeUnitId` changes, and drives restoration
  // ────────────────────────────────────────────────

  constructor() {
    effect(() => {
      const tree = this.tree();

      if (!tree.length) {
        return;
      }

      this.countryList.set(tree);

      const id = this.administrativeUnitId();

      if (!id) {
        this.lastRestoredId = null;
        return;
      }

      // Already restored this exact id — nothing to do.
      if (this.lastRestoredId === id) {
        return;
      }

      // Try to restore. Only lock in `lastRestoredId` on success,
      // so that if the target node isn't in the tree yet, a later
      // tree update can retry instead of being skipped forever.
      const restored = this.restoreSelection(id);

      if (restored) {
        this.lastRestoredId = id;
      }
    });
  }

  // ────────────────────────────────────────────────
  // Change handlers — one per cascade level.
  // Each updates the selected id, resets/populates the next
  // level down, and emits the final selected id upward
  // (suppressed while `restoring` is true).
  // ────────────────────────────────────────────────

  onCountryChange(id: string): void {
    if (!this.restoring) {
      this.selectedIdChanged.emit('');
    }

    this.selectedCountry.set(id);
    this.resetState();

    const country = this.countryList().find((x) => x.id === id);
    this.stateList.set(country?.children ?? []);
  }

  onStateChange(id: string): void {
    if (!this.restoring) {
      this.selectedIdChanged.emit('');
    }

    this.selectedState.set(id);
    this.resetDistrict();

    const state = this.stateList().find((x) => x.id === id);
    this.districtList.set(state?.children ?? []);
  }

  onDistrictChange(id: string): void {
    if (!this.restoring) {
      this.selectedIdChanged.emit('');
    }

    this.selectedDistrict.set(id);
    this.resetArea();

    const district = this.districtList().find((x) => x.id === id);
    const children = district?.children ?? [];

    this.blockList.set(children.filter((x) => x.administrativeUnitTypeName === 'Block'));
    this.municipalityList.set(
      children.filter((x) => x.administrativeUnitTypeName === 'Municipality'),
    );
  }

  onBlockChange(id: string): void {
    if (!this.restoring) {
      this.selectedIdChanged.emit('');
    }

    this.selectedBlock.set(id);
    this.selectedGramPanchayat.set(null);
    this.selectedVillage.set(null);
    this.villageList.set([]);

    const block = this.blockList().find((x) => x.id === id);
    this.gramPanchayatList.set(block?.children ?? []);
  }

  onMunicipalityChange(id: string): void {
    if (!this.restoring) {
      this.selectedIdChanged.emit('');
    }

    this.selectedMunicipality.set(id);
    this.selectedWard.set(null);

    const municipality = this.municipalityList().find((x) => x.id === id);
    this.wardList.set(municipality?.children ?? []);
  }

  onGramPanchayatChange(id: string): void {
    if (!this.restoring) {
      this.selectedIdChanged.emit('');
    }

    this.selectedGramPanchayat.set(id);
    this.selectedVillage.set(null);

    const gp = this.gramPanchayatList().find((x) => x.id === id);
    this.villageList.set(gp?.children ?? []);
  }

  onWardChange(id: string): void {
    this.selectedWard.set(id);

    if (!this.restoring) {
      this.selectedIdChanged.emit(id);
    }
  }

  onVillageChange(id: string): void {
    this.selectedVillage.set(id);

    if (!this.restoring) {
      this.selectedIdChanged.emit(id);
    }
  }

  /** Toggle between Rural and Urban branches, re-deriving Block/Municipality lists for the current district. */
  changeMode(mode: 'Rural' | 'Urban'): void {
    this.restoring = true;

    try {
      this.mode.set(mode);

      this.selectedBlock.set(null);
      this.selectedMunicipality.set(null);
      this.selectedGramPanchayat.set(null);
      this.selectedWard.set(null);
      this.selectedVillage.set(null);

      this.gramPanchayatList.set([]);
      this.wardList.set([]);
      this.villageList.set([]);

      const districtId = this.selectedDistrict();

      if (districtId) {
        this.onDistrictChange(districtId);
      }
    } finally {
      this.restoring = false;
    }
  }

  // ────────────────────────────────────────────────
  // Reset helpers — clear selections/lists downstream
  // of a given level
  // ────────────────────────────────────────────────

  private resetState(): void {
    this.selectedState.set(null);
    this.resetDistrict();
    this.stateList.set([]);
  }

  private resetDistrict(): void {
    this.selectedDistrict.set(null);
    this.resetArea();
    this.districtList.set([]);
  }

  private resetArea(): void {
    this.selectedBlock.set(null);
    this.selectedMunicipality.set(null);
    this.selectedGramPanchayat.set(null);
    this.selectedWard.set(null);
    this.selectedVillage.set(null);

    this.blockList.set([]);
    this.municipalityList.set([]);
    this.gramPanchayatList.set([]);
    this.wardList.set([]);
    this.villageList.set([]);
  }

  // ────────────────────────────────────────────────
  // Restoration — given an id, walk up to the root to build
  // a path, then replay onXChange down the path to rebuild
  // every list/selection in the cascade
  // ────────────────────────────────────────────────

  /** Depth-first search for a node by id anywhere in the tree. */
  private findNode(
    nodes: AdministrativeUnitTreeNode[],
    id: string,
  ): AdministrativeUnitTreeNode | null {
    for (const node of nodes) {
      if (node.id === id) return node;

      const child = this.findNode(node.children ?? [], id);
      if (child) return child;
    }

    return null;
  }

  /**
   * Restores the full cascade selection for a given leaf id.
   * Returns true if the node was found and restored, false if
   * the node isn't in the tree yet (caller should retry later).
   */
  private restoreSelection(id: string): boolean {
    this.restoring = true;

    try {
      const node = this.findNode(this.tree(), id);

      if (!node) {
        return false;
      }

      // Walk up parent links to build root → node path.
      const path: AdministrativeUnitTreeNode[] = [];
      let current: AdministrativeUnitTreeNode | null = node;

      while (current) {
        path.unshift(current);
        current = current.parentId ? this.findNode(this.tree(), current.parentId) : null;
      }

      if (path.length >= 1) this.onCountryChange(path[0].id);
      if (path.length >= 2) this.onStateChange(path[1].id);
      if (path.length >= 3) this.onDistrictChange(path[2].id);

      if (path.length >= 4) {
        switch (path[3].administrativeUnitTypeName) {
          case 'Block':
            this.mode.set('Rural');
            this.onBlockChange(path[3].id);
            break;

          case 'Municipality':
            this.mode.set('Urban');
            this.onMunicipalityChange(path[3].id);
            break;
        }
      }

      if (path.length >= 5) {
        switch (path[4].administrativeUnitTypeName) {
          case 'Gram Panchayat':
            this.onGramPanchayatChange(path[4].id);
            break;

          case 'Ward':
            this.onWardChange(path[4].id);
            break;
        }
      }

      if (path.length >= 6) {
        this.onVillageChange(path[5].id);
      }

      return true;
    } finally {
      this.restoring = false;
    }
  }
}
