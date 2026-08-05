import { Component, effect, inject, signal } from '@angular/core';
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
	administrativeUnitTreeNodes = this.administrativeUnitStore.administrativeUnitTree;

	constructor() {
		effect(() => {
			const nodes = this.administrativeUnitTreeNodes();
			if (!nodes.length) return;

			const selectedId = this.selectedAdministrativeUnitId();

			if (this.containsNode(nodes, selectedId)) {
				queueMicrotask(() => {
					this.selectedAdministrativeUnitId.set(selectedId);
				});
			} else {
				this.selectedAdministrativeUnitId.set(nodes[0].id);
			}
		});
	}

	protected onAdd() {
		this.isViewMode.set(false);
		this.selectedAdministrativeUnitId.set(EMPTY_UUID);
	}

	protected viewDetail(id: string) {
		this.selectedAdministrativeUnitId.set(id);
	}

	protected onEdit() {
		this.isViewMode.set(false);
	}

	private containsNode(nodes: AdministrativeUnitTreeNode[], id: string): boolean {
		return nodes.some(node =>
			node.id === id || this.containsNode(node.children ?? [], id)
		);
	}
}
