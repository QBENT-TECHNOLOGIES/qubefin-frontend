import { Component, effect, inject, signal } from '@angular/core';
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
  organizationUnitTreeNodes = this.organizationUnitStore.organizationUnitTree;

  constructor() {
    effect(() => {
      const nodes = this.organizationUnitTreeNodes();
      if (!nodes.length) return;

      const selectedId = this.selectedOrganizationUnitId();

      if (!this.containsNode(nodes, selectedId)) {
        this.selectedOrganizationUnitId.set(nodes[0].id);
      }
    });
  }

  protected onAdd() {
    this.isViewMode.set(false);
    this.selectedOrganizationUnitId.set(EMPTY_UUID);
  }

  protected viewDetail(id: string) {
    this.selectedOrganizationUnitId.set(id);
  }

  protected onEdit() {
    this.isViewMode.set(false);
  }

  protected onClose() {
    this.isViewMode.set(true);
  }

  private containsNode(nodes: OrganizationUnitTreeNode[], id: string): boolean {
    return nodes.some((node) => node.id === id || this.containsNode(node.children ?? [], id));
  }
}
