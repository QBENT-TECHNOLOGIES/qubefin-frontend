import { Component, effect, input, output, signal, ViewChild } from '@angular/core';
import { OrganizationUnitTreeNode } from '../../models/organization-unit-tree-node';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTree, MatTreeModule } from '@angular/material/tree';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { APP_ICONS_MAP } from '../../../../lucide-icons';

@Component({
  selector: 'qfin-organization-unit-tree-component',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTreeModule,
    MatTooltipModule,
    LucideDynamicIcon,
  ],
  templateUrl: './organization-unit-tree.html',
})
export class OrganizationUnitTreeComponent {
  onViewDetail = output<string>();

  selectedId = signal<string>('');
  readonly iconMap = APP_ICONS_MAP;

  @ViewChild(MatTree) tree!: MatTree<any>;
  organizationUnitTreeNodes = input<OrganizationUnitTreeNode[]>([]);

  childrenAccessor = (node: OrganizationUnitTreeNode) => {
    return node.children ?? [];
  };

  hasChild = (_: number, node: OrganizationUnitTreeNode) =>
    !!node.children && node.children.length > 0;

  constructor() {
    effect(() => {
      if (this.organizationUnitTreeNodes().length > 0) {
        this.selectedId.set(this.organizationUnitTreeNodes()[0].id);
      }
    });

    effect(() => {
      const nodes = this.organizationUnitTreeNodes();

      if (!this.tree || nodes.length === 0) {
        return;
      }

      queueMicrotask(() => this.expandAll());
    });
  }

  onDetailView(id: string) {
    this.selectedId.set(id);
    this.onViewDetail.emit(id);
  }
  private expandAll(): void {
    const nodes = this.organizationUnitTreeNodes();

    for (const node of nodes) {
      this.expandNode(node);
    }
  }

  private expandNode(node: OrganizationUnitTreeNode): void {
    this.tree.expand(node);

    if (node.children?.length) {
      for (const child of node.children) {
        this.expandNode(child);
      }
    }
  }
}
