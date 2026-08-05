import { Component, effect, inject, model, output, signal } from '@angular/core';
import { AdministrativeUnitStore } from '../../stores/administrative-unit-store';
import { MatIconModule } from '@angular/material/icon';
import { EMPTY_UUID, PermissionStore } from 'qubefin-core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { CommonModule, DatePipe } from '@angular/common';
import { LucideDynamicIcon } from '@lucide/angular';

@Component({
	selector: 'qfin-administrative-unit-view-component',
	imports: [CommonModule, DatePipe, MatIconModule, MatTooltipModule, LucideDynamicIcon],
	templateUrl: './administrative-unit-view.html'
})
export class AdministrativeUnitViewComponent {
	permissionStore = inject(PermissionStore);
	administrativeUnitStore = inject(AdministrativeUnitStore);

	administrativeUnitId = model<string>(EMPTY_UUID);
	readonly iconMap = APP_ICONS_MAP;

	showEdit = output<boolean>();

	administrativeUnit = this.administrativeUnitStore.administrativeUnit;

	constructor() {
		effect(() => {
			const id = this.administrativeUnitId();

			if (id && id !== EMPTY_UUID) {
				this.administrativeUnitStore.setAdministrativeUnitId(id);
			}
			// if (this.administrativeUnitId()) {
			// 	this.administrativeUnitStore.setAdministrativeUnitId(this.administrativeUnitId());
			// }
		});
	}

	onShowEdit() {
		this.showEdit.emit(true);
	}
}


