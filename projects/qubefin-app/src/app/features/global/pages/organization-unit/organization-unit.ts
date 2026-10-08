import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { EMPTY_UUID, PermissionStore } from 'qubefin-core';
import { OrganizationUnitStore } from '../../stores/organization-unit-store';
import { OrganizationUnitTreeComponent } from '../../components/organization-unit-tree/organization-unit-tree';
import { OrganizationUnitViewComponent } from '../../components/organization-unit-view/organization-unit-view';
import { OrganizationUnitDetailComponent } from '../../components/organization-unit-detail/organization-unit-detail';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { LucideDynamicIcon } from '@lucide/angular';
import { OrganizationUnitTreeNode } from '../../models/organization-unit-tree-node';

@Component({
  selector: 'qfin-organization-unit-page',
  imports: [
    OrganizationUnitTreeComponent,
    OrganizationUnitViewComponent,
    OrganizationUnitDetailComponent,
    LucideDynamicIcon,
  ],
  templateUrl: './organization-unit.html',
})
export class OrganizationUnitPage {
  readonly permissionStore = inject(PermissionStore);
  readonly organizationUnitStore = inject(OrganizationUnitStore);

  readonly iconMap = APP_ICONS_MAP;

  isViewMode = signal<boolean>(true);
  selectedOrganizationUnitId = signal<string>(EMPTY_UUID);
  protected editingOrganizationUnitId = signal<string>(EMPTY_UUID);

  organizationUnitTreeNodes = this.organizationUnitStore.organizationUnitTree;
  protected searchText = signal<string>('');
  protected appliedSearchText = signal<string>('');

  protected readonly filteredOrganizationUnitTreeNodes = computed(() => {
    const term = this.appliedSearchText().trim().toLowerCase();
    const nodes = this.organizationUnitTreeNodes();

    return term ? this.filterNodes(nodes, term) : nodes;
  });

  constructor() {
    effect(() => {
      const nodes = this.organizationUnitTreeNodes();
      if (!nodes.length) return;

      const selectedId = untracked(this.selectedOrganizationUnitId);
      if (this.containsNode(nodes, selectedId)) return;

      this.selectedOrganizationUnitId.set(nodes[0].id);
    });
  }

  protected onAdd() {
    this.editingOrganizationUnitId.set(EMPTY_UUID);
    this.isViewMode.set(false);
  }

  protected viewDetail(id: string) {
    this.selectedOrganizationUnitId.set(id);
  }

  protected onEdit() {
    this.editingOrganizationUnitId.set(this.selectedOrganizationUnitId());
    this.isViewMode.set(false);
  }

  protected onClose() {
    this.isViewMode.set(true);
  }

  protected onSaved() {
    this.isViewMode.set(true);
  }

  protected onSearch(event: Event) {
    this.searchText.set((event.target as HTMLInputElement).value);
  }

  protected applyFilter() {
    this.appliedSearchText.set(this.searchText());
  }

  private containsNode(nodes: OrganizationUnitTreeNode[], id: string): boolean {
    return nodes.some((node) => node.id === id || this.containsNode(node.children ?? [], id));
  }

  private filterNodes(
    nodes: OrganizationUnitTreeNode[],
    term: string,
  ): OrganizationUnitTreeNode[] {
    const matches: OrganizationUnitTreeNode[] = [];

    for (const node of nodes) {
      if (this.matchesTerm(node, term)) {
        matches.push(node);
        continue;
      }

      const children = this.filterNodes(node.children ?? [], term);
      if (children.length) {
        matches.push({ ...node, children });
      }
    }

    return matches;
  }

  private matchesTerm(node: OrganizationUnitTreeNode, term: string): boolean {
    return (
      node.name.toLowerCase().includes(term) ||
      (node.organizationUnitTypeName ?? '').toLowerCase().includes(term)
    );
  }
}
