import { Component, effect, inject, model, output } from '@angular/core';
import { EMPTY_UUID, PermissionStore } from 'qubefin-core';
import { OrganizationUnitStore } from '../../stores/organization-unit-store';

@Component({
	selector: 'qfin-organization-unit-view-component',
	imports: [],
	templateUrl: './organization-unit-view.html'
})
export class OrganizationUnitViewComponent {
	permissionStore = inject(PermissionStore);
	organizationUnitStore = inject(OrganizationUnitStore);

	organizationUnitId = model<string>(EMPTY_UUID);

	showEdit = output<boolean>();

	organizationUnit = this.organizationUnitStore.organizationUnit;

	constructor() {
		effect(() => {
			if (this.organizationUnitId()) {
				this.organizationUnitStore.setOrganizationUnitId(this.organizationUnitId());
			}
		});

		effect(() => {
			console.log('Organization Unit:', this.organizationUnit());
		});
	}

	onShowEdit() {
		this.showEdit.emit(true);
	}

}
