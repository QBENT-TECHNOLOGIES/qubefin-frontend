import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { AdministrativeUnitTreeComponent } from '../../components/administrative-unit-tree/administrative-unit-tree';
import { EMPTY_UUID, PermissionStore } from 'qubefin-core';
import { AdministrativeUnitDetailComponent } from '../../components/administrative-unit-detail/administrative-unit-detail';
import { AdministrativeUnitStore } from '../../stores/administrative-unit-store';
import { AdministrativeUnitViewComponent } from '../../components/administrative-unit-view/administrative-unit-view';
import { MatTooltipModule } from '@angular/material/tooltip';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { LucideDynamicIcon } from '@lucide/angular';
import { AdministrativeUnitTreeNode } from '../../models/administrative-unit-tree-node';

@Component({
	selector: 'qfin-administrative-unit-page',
	imports: [AdministrativeUnitTreeComponent, AdministrativeUnitDetailComponent, AdministrativeUnitViewComponent, MatTooltipModule, LucideDynamicIcon],
	templateUrl: './administrative-unit.html'
})
export class AdministrativeUnitPage {
	readonly permissionStore = inject(PermissionStore);
	readonly administrativeUnitStore = inject(AdministrativeUnitStore);

	readonly iconMap = APP_ICONS_MAP;

	isViewMode = signal<boolean>(true);
	selectedAdministrativeUnitId = signal<string>(EMPTY_UUID);

	// Id handed to the detail form: EMPTY_UUID while creating, the selected unit while
	// editing. Kept apart from the tree selection so opening the create form never makes
	// the form believe it is editing whichever node the tree happens to have selected.
	protected editingAdministrativeUnitId = signal<string>(EMPTY_UUID);

	administrativeUnitTreeNodes = this.administrativeUnitStore.administrativeUnitTree;

	// What is typed in the box, kept apart from what the Filter button has applied, so
	// the tree only changes when the button (or Enter) is used.
	protected searchText = signal<string>('');
	protected appliedSearchText = signal<string>('');

	protected readonly filteredAdministrativeUnitTreeNodes = computed(() => {
		const term = this.appliedSearchText().trim().toLowerCase();
		const nodes = this.administrativeUnitTreeNodes();

		return term ? this.filterNodes(nodes, term) : nodes;
	});

	constructor() {
		// Keep the tree selection valid: select the first node once the tree loads, or
		// when a refresh drops the previously selected node. The selection is read
		// untracked so selecting a node never re-runs this and overrides that choice.
		effect(() => {
			const nodes = this.administrativeUnitTreeNodes();
			if (!nodes.length) return;

			const selectedId = untracked(this.selectedAdministrativeUnitId);
			if (this.containsNode(nodes, selectedId)) return;

			this.selectedAdministrativeUnitId.set(nodes[0].id);
		});
	}

	protected onAdd() {
		this.editingAdministrativeUnitId.set(EMPTY_UUID);
		this.isViewMode.set(false);
	}

	protected viewDetail(id: string) {
		this.selectedAdministrativeUnitId.set(id);
	}

	protected onEdit() {
		this.editingAdministrativeUnitId.set(this.selectedAdministrativeUnitId());
		this.isViewMode.set(false);
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

	private containsNode(nodes: AdministrativeUnitTreeNode[], id: string): boolean {
		return nodes.some(node =>
			node.id === id || this.containsNode(node.children ?? [], id)
		);
	}

	private filterNodes(nodes: AdministrativeUnitTreeNode[], term: string): AdministrativeUnitTreeNode[] {
		const matches: AdministrativeUnitTreeNode[] = [];

		for (const node of nodes) {
			// A node that matches keeps its whole subtree; one that does not is kept only
			// as the path leading to a matching descendant.
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

	private matchesTerm(node: AdministrativeUnitTreeNode, term: string): boolean {
		return node.name.toLowerCase().includes(term)
			|| (node.administrativeUnitTypeName ?? '').toLowerCase().includes(term);
	}
}
