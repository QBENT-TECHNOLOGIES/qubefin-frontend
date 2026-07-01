import { Component, effect, inject } from '@angular/core';
import { AdministrativeUnitTree } from '../../components/administrative-unit-tree/administrative-unit-tree';
import { ActivatedRoute } from '@angular/router';
import { RouteDataService, RouteMeta } from 'qubefin-core';
import { Observable } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
	selector: 'qfin-administrative-unit',
	imports: [AdministrativeUnitTree],
	templateUrl: './administrative-unit.html'
})
export class AdministrativeUnit {
	private readonly route = inject(ActivatedRoute);
	private readonly routeDataService = inject(RouteDataService);

	private routeData = toSignal(this.route.data as Observable<RouteMeta>, {
		initialValue: { title: '', icon: '' }
	});

	constructor() {
		effect(() => {
			this.routeDataService.setRouteData(this.routeData());
		});
	}
}
