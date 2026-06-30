import { Component, inject, effect } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTreeModule } from '@angular/material/tree';
import { AdministrativeUnitStore } from '../../stores/administrative-unit-store';
import { AdministrativeUnitTreeNode } from '../../models/administrative-unit-tree-node';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'qfin-administrative-unit-tree',
	imports: [CommonModule, MatButtonModule, MatIconModule, MatTreeModule],
	templateUrl: './administrative-unit-tree.html'
})
export class AdministrativeUnitTree {
	administrativeUnitStore = inject(AdministrativeUnitStore);

	administrativeUnitTree = this.administrativeUnitStore.administrativeUnitTree;

	childrenAccessor = (node: AdministrativeUnitTreeNode) => {
		//console.log(node.name, node.children);
		return node.children ?? [];
	}

	hasChild = (_: number, node: AdministrativeUnitTreeNode) => !!node.children && node.children.length > 0;
}
