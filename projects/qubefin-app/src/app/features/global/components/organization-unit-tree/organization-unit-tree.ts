import { Component, effect, input, output, signal } from '@angular/core';
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
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTreeModule, MatTooltipModule, LucideDynamicIcon],
  templateUrl: './organization-unit-tree.html'
})
export class OrganizationUnitTreeComponent {
	onViewDetail = output<string>();

	selectedId = signal<string>('');
	readonly iconMap = APP_ICONS_MAP;

	organizationUnitTreeNodes = input<OrganizationUnitTreeNode[]>([]);

	childrenAccessor = (node: OrganizationUnitTreeNode) => {
		return node.children ?? [];
	}

	hasChild = (_: number, node: OrganizationUnitTreeNode) => !!node.children && node.children.length > 0;

	constructor() {
		effect(() => {
			if (this.organizationUnitTreeNodes().length > 0) {
				this.selectedId.set(this.organizationUnitTreeNodes()[0].id);
			}
		});
	}

	onDetailView(id: string) {
		this.selectedId.set(id);
		this.onViewDetail.emit(id);
	}
}
