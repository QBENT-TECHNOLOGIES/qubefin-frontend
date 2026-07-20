import { Component, effect, inject, signal } from '@angular/core';
import { AdministrativeUnitTreeComponent } from '../../components/administrative-unit-tree/administrative-unit-tree';
import { EMPTY_UUID, PermissionStore } from 'qubefin-core';
import { AdministrativeUnitDetailComponent } from '../../components/administrative-unit-detail/administrative-unit-detail';
import { AdministrativeUnitStore } from '../../stores/administrative-unit-store';
import { AdministrativeUnitViewComponent } from '../../components/administrative-unit-view/administrative-unit-view';
import { MatTooltipModule } from '@angular/material/tooltip';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { LucideDynamicIcon } from '@lucide/angular';

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
			if (this.administrativeUnitTreeNodes().length > 0) {
				this.selectedAdministrativeUnitId.set(this.administrativeUnitTreeNodes()[0].id);
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
}
