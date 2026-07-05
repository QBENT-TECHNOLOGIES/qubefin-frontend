import { Component, effect, inject, model, output, signal } from '@angular/core';
import { AdministrativeUnitStore } from '../../stores/administrative-unit-store';
import { MatIconModule } from '@angular/material/icon';
import { EMPTY_UUID } from 'qubefin-core';

@Component({
	selector: 'qfin-administrative-unit-view',
	imports: [MatIconModule],
	templateUrl: './administrative-unit-view.html'
})
export class AdministrativeUnitView {
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
	}

	onShowEdit() {
		this.showEdit.emit(true);
	}
}
