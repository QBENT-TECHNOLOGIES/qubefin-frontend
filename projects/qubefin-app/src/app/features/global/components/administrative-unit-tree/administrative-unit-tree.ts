import { Component, inject, effect, ViewChild, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTreeModule } from '@angular/material/tree';
import { AdministrativeUnitTreeNode } from '../../models/administrative-unit-tree-node';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'qfin-administrative-unit-tree',
	imports: [CommonModule, MatButtonModule, MatIconModule, MatTreeModule],
	templateUrl: './administrative-unit-tree.html'
})
export class AdministrativeUnitTree {
	
	onViewDetail = output<string>();	

	administrativeUnitTreeNodes = input<AdministrativeUnitTreeNode[]>([]);

	childrenAccessor = (node: AdministrativeUnitTreeNode) => {
		return node.children ?? [];
	}

	hasChild = (_: number, node: AdministrativeUnitTreeNode) => !!node.children && node.children.length > 0;

	onDetailView(id: string) {
		this.onViewDetail.emit(id);
	}
}
