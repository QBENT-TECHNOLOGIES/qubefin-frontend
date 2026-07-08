import { Component, inject, effect, ViewChild, input, output, AfterViewInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTree, MatTreeModule } from '@angular/material/tree';
import { AdministrativeUnitTreeNode } from '../../models/administrative-unit-tree-node';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'qfin-administrative-unit-tree',
	imports: [CommonModule, MatButtonModule, MatIconModule, MatTreeModule],
	templateUrl: './administrative-unit-tree.html'
})
export class AdministrativeUnitTree implements AfterViewInit {

	ngAfterViewInit(): void {
		this.tree.expand(this.administrativeUnitTreeNodes()[0]);
	}
	
	@ViewChild(MatTree) tree!: MatTree<any>;
	onViewDetail = output<string>();

	selectedId = signal<string>('');

	administrativeUnitTreeNodes = input<AdministrativeUnitTreeNode[]>([]);

	childrenAccessor = (node: AdministrativeUnitTreeNode) => {
		return node.children ?? [];
	}

	hasChild = (_: number, node: AdministrativeUnitTreeNode) => !!node.children && node.children.length > 0;

	constructor() {
		effect(() => {
			if (this.administrativeUnitTreeNodes().length > 0) {
				this.selectedId.set(this.administrativeUnitTreeNodes()[0].id);
			}
		});
	}

	onDetailView(id: string) {
		this.selectedId.set(id);
		this.onViewDetail.emit(id);
	}
}
