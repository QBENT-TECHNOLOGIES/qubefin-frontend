import { Component, effect, inject, model, output, signal } from '@angular/core';
import { AdministrativeUnitStore } from '../../stores/administrative-unit-store';
import { MatIconModule } from '@angular/material/icon';
import { EMPTY_UUID, PermissionStore } from 'qubefin-core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucidePencil, LucideUserCheck, LucideCalendarPlus, LucideUserCog, LucideCalendarClock, LucideUser,
	LucideLayers,  LucideBuilding2, LucideMapPinned, LucideLandmark, LucideFactory
 } from '@lucide/angular';

@Component({
	selector: 'qfin-administrative-unit-view',
	imports: [MatIconModule, MatTooltipModule, LucidePencil, LucideUserCheck, LucideCalendarPlus, LucideUserCog, 
		LucideCalendarClock, LucideUser, LucideLayers, LucideBuilding2, LucideMapPinned, LucideLandmark, LucideFactory],
	templateUrl: './administrative-unit-view.html'
})
export class AdministrativeUnitView {
	permissionStore = inject(PermissionStore);
	administrativeUnitStore = inject(AdministrativeUnitStore);

	administrativeUnitId = model<string>(EMPTY_UUID);

	showEdit = output<boolean>();

	administrativeUnit = this.administrativeUnitStore.administrativeUnit;

	constructor() {
		effect(() => {
			if (this.administrativeUnitId()) {
				this.administrativeUnitStore.setAdministrativeUnitId(this.administrativeUnitId());
			}
		});

		effect(() => {
			console.log('Administrative Unit:', this.administrativeUnit());
		});
	}
	
	onShowEdit() {
		this.showEdit.emit(true);
	}

	getIcon(typeName: string): string {
		const icons: Record<string, string> = {
		Country: 'building2',
		State: 'landmark',
		District: 'map-pinned',
		Division: 'layers',
		Branch: 'factory',
		Office: 'house',
		};

		return icons[typeName] ?? 'layers';
	}
}


