import { AfterViewInit, Component, effect, input, output, signal, ViewChild } from '@angular/core';
import { MatTree, MatTreeModule } from '@angular/material/tree';
import { MatIconModule } from '@angular/material/icon';
import { LucideDynamicIcon } from '@lucide/angular';
import { APP_ICONS_MAP } from '../../../../../lucide-icons';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MenuTreeNode } from '../../../models/menu';

@Component({
	selector: 'qfin-menu-tree-component',
	imports: [MatIconModule, MatTreeModule, MatTooltipModule, LucideDynamicIcon],
	templateUrl: './menu-tree.html'
})
export class MenuTreeComponent implements AfterViewInit {
	@ViewChild(MatTree) tree!: MatTree<MenuTreeNode>;
	onViewDetail = output<string>();

	selectedId = signal<string>('');
	readonly iconMap = APP_ICONS_MAP;

	menuTreeNodes = input<MenuTreeNode[]>([]);
	selectedMenuId = input<string>('');

	childrenAccessor = (node: MenuTreeNode) => {
		return node.children ?? [];
	}

	hasChild = (_: number, node: MenuTreeNode) => !!node.children && node.children.length > 0;

	ngAfterViewInit(): void {
		this.expandAll();
	}

	constructor() {
		// Keep every branch open, so a node selected after a save - or one surfaced by the
		// search filter - is actually visible rather than hidden under a collapsed parent.
		effect(() => {
			const nodes = this.menuTreeNodes();
			if (!this.tree || !nodes.length) return;

			queueMicrotask(() => this.expandAll());
		});

		effect(() => {
			const nodes = this.menuTreeNodes();
			if (!nodes.length) return;

			const externalSelectedId = this.selectedMenuId();
			if (externalSelectedId && this.containsNode(nodes, externalSelectedId)) {
				this.selectedId.set(externalSelectedId);
				return;
			}

			if (!this.containsNode(nodes, this.selectedId())) {
				this.selectedId.set(nodes[0].id);
			}
		});
	}

	onDetailView(id: string) {
		this.selectedId.set(id);
		this.onViewDetail.emit(id);
	}

	private containsNode(nodes: MenuTreeNode[], id: string): boolean {
		return nodes.some(node => node.id === id || this.containsNode(node.children ?? [], id));
	}

	private expandAll(): void {
		for (const node of this.menuTreeNodes()) {
			this.expandNode(node);
		}
	}

	private expandNode(node: MenuTreeNode): void {
		this.tree.expand(node);

		for (const child of node.children ?? []) {
			this.expandNode(child);
		}
	}
}
