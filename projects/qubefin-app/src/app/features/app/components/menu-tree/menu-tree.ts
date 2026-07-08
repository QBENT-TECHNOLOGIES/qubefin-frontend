import { Component, effect, input, output, signal } from '@angular/core';
import { MenuTreeNode } from '../../models/menu-tree-node';
import { MatTreeModule } from '@angular/material/tree';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'qfin-menu-tree-component',
  imports: [MatIconModule, MatTreeModule],
  templateUrl: './menu-tree.html'
})
export class MenuTreeComponent {
  onViewDetail = output<string>();

	selectedId = signal<string>('');

	menuTreeNodes = input<MenuTreeNode[]>([]);

	childrenAccessor = (node: MenuTreeNode) => {
		return node.children ?? [];
	}

	hasChild = (_: number, node: MenuTreeNode) => !!node.children && node.children.length > 0;

	constructor() {
		effect(() => {
			if (this.menuTreeNodes().length > 0) {
				this.selectedId.set(this.menuTreeNodes()[0].id);
			}
		});
	}

	onDetailView(id: string) {
		this.selectedId.set(id);
		this.onViewDetail.emit(id);
	}
}
