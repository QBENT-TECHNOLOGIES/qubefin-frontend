import { Component, effect, inject, model, signal } from '@angular/core';
import { AdministrativeUnitStore } from '../../stores/administrative-unit-store';
import { AdministrativeUnitRequest } from '../../models/administrative-unit-request';
import { form, required, schema, Schema } from '@angular/forms/signals';
import { MatIconModule } from '@angular/material/icon';

@Component({
	selector: 'qfin-administrative-unit-detail',
	imports: [MatIconModule],
	templateUrl: './administrative-unit-detail.html'
})
export class AdministrativeUnitDetail {
	administrativeUnitStore = inject(AdministrativeUnitStore);

	administrativeUnitId = model<string>('');

	administrativeUnit = this.administrativeUnitStore.administrativeUnit;

	constructor() {
		effect(() => {
			if (this.administrativeUnitId()) {
				this.administrativeUnitStore.setAdministrativeUnitId(this.administrativeUnitId());
			}
		});
	}

	protected readonly administrativeUnitModel = signal<AdministrativeUnitRequest>({
		id: '',
		name: '',
		administrativeUnitTypeId: '',
		administrativeUnitTypeIcon: '',
		administrativeUnitTypeName: '',
		parentId: '',
		parentName: '',
		isActive: true
	});
	protected readonly administrativeUnitSchema: Schema<AdministrativeUnitRequest> = schema((path) => {
		required(path.name, { message: 'Administrative Unit Name is required' });
	});
	protected readonly administrativeUnitForm = form(this.administrativeUnitModel, this.administrativeUnitSchema);
}
