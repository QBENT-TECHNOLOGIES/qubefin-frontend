import { Component, inject, effect, ViewChild, input, output, AfterViewInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTree, MatTreeModule } from '@angular/material/tree';
import { AdministrativeUnitTreeNode } from '../../models/administrative-unit-tree-node';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { LucideDynamicIcon } from '@lucide/angular';

@Component({
	selector: 'qfin-administrative-unit-tree-component',
	imports: [CommonModule, MatButtonModule, MatIconModule, MatTreeModule, MatTooltipModule, LucideDynamicIcon],
	templateUrl: './administrative-unit-tree.html'
})
export class AdministrativeUnitTreeComponent implements AfterViewInit {

	ngAfterViewInit(): void {
		this.expandAll();
	}

	@ViewChild(MatTree) tree!: MatTree<any>;
	onViewDetail = output<string>();

	selectedId = input<string>('');
	readonly iconMap = APP_ICONS_MAP;

	administrativeUnitTreeNodes = input<AdministrativeUnitTreeNode[]>([]);

	childrenAccessor = (node: AdministrativeUnitTreeNode) => {
		return node.children ?? [];
	}

	hasChild = (_: number, node: AdministrativeUnitTreeNode) => !!node.children && node.children.length > 0;

	constructor() {
		effect(() => {
			const nodes = this.administrativeUnitTreeNodes();

			if (!this.tree || nodes.length === 0) {
				return;
			}

			queueMicrotask(() => this.expandAll());
		});
	}

	onDetailView(id: string) {
		//this.selectedId.set(id);
		this.onViewDetail.emit(id);
	}

	private expandAll(): void {
		const nodes = this.administrativeUnitTreeNodes();

		for (const node of nodes) {
			this.expandNode(node);
		}
	}

	private expandNode(node: AdministrativeUnitTreeNode): void {
		this.tree.expand(node);

		if (node.children?.length) {
			for (const child of node.children) {
				this.expandNode(child);
			}
		}
	}
}
