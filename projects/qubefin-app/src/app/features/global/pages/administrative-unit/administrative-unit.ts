import { Component, effect, inject, signal } from '@angular/core';
import { AdministrativeUnitTreeComponent } from '../../components/administrative-unit-tree/administrative-unit-tree';
import { ActivatedRoute } from '@angular/router';
import { EMPTY_UUID, RouteDataService, RouteMeta, PermissionStore } from 'qubefin-core';
import { Observable } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { AdministrativeUnitDetailComponent } from '../../components/administrative-unit-detail/administrative-unit-detail';
import { AdministrativeUnitStore } from '../../stores/administrative-unit-store';
import { AdministrativeUnitViewComponent } from '../../components/administrative-unit-view/administrative-unit-view';
import { Breadcrumb } from '../../../../layouts/secure/breadcrumb/breadcrumb';
import { LucidePlus, LucideSearch, LucideFunnel } from '@lucide/angular';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
	selector: 'qfin-administrative-unit-page',
	imports: [AdministrativeUnitTreeComponent, AdministrativeUnitDetailComponent, AdministrativeUnitViewComponent, Breadcrumb, LucidePlus, MatTooltipModule, LucideSearch, LucideFunnel],
	templateUrl: './administrative-unit.html'
})
export class AdministrativeUnitPage {
	private readonly route = inject(ActivatedRoute);
	private readonly routeDataService = inject(RouteDataService);

	readonly permissionStore = inject(PermissionStore);
	readonly administrativeUnitStore = inject(AdministrativeUnitStore);

	isViewMode = signal<boolean>(true);
	selectedAdministrativeUnitId = signal<string>(EMPTY_UUID);
	administrativeUnitTreeNodes = this.administrativeUnitStore.administrativeUnitTree;

	private routeData = toSignal(this.route.data as Observable<RouteMeta>, {
		initialValue: { title: '', icon: '' }
	});

	constructor() {
		effect(() => {
			this.routeDataService.setRouteData(this.routeData());
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
