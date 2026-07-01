import { Component, effect, inject, signal } from '@angular/core';
import { AdministrativeUnitTree } from '../../components/administrative-unit-tree/administrative-unit-tree';
import { ActivatedRoute } from '@angular/router';
import { RouteDataService, RouteMeta } from 'qubefin-core';
import { Observable } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { AdministrativeUnitDetail } from '../../components/administrative-unit-detail/administrative-unit-detail';
import { AdministrativeUnitStore } from '../../stores/administrative-unit-store';

@Component({
	selector: 'qfin-administrative-unit',
	imports: [AdministrativeUnitTree, AdministrativeUnitDetail],
	templateUrl: './administrative-unit.html'
})
export class AdministrativeUnit {
	private readonly route = inject(ActivatedRoute);
	private readonly routeDataService = inject(RouteDataService);

	administrativeUnitStore = inject(AdministrativeUnitStore);

	selectedAdministrativeUnitId = signal<string>('');
	administrativeUnitTreeNodes = this.administrativeUnitStore.administrativeUnitTree;

	private routeData = toSignal(this.route.data as Observable<RouteMeta>, {
		initialValue: { title: '', icon: '' }
	});

	constructor() {
		effect(() => {
			this.routeDataService.setRouteData(this.routeData());
		});
	}

	protected viewDetail(id: string) {
		this.selectedAdministrativeUnitId.set(id);
	}
}
