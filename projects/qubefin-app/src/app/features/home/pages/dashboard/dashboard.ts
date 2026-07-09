import { Component, effect, inject } from '@angular/core';
import { RouteDataService, RouteMeta } from 'qubefin-core';
import { Observable } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { LucideBanknoteX, LucideHandCoins, LucideIndianRupee, LucideTrendingDown, LucideTrendingUp, LucideUser, LucideWallet } from '@lucide/angular';
@Component({
	selector: 'qfin-dashboard',
	imports: [LucideHandCoins, LucideTrendingUp, LucideWallet, LucideTrendingDown, LucideIndianRupee, LucideBanknoteX, LucideUser],
	templateUrl: './dashboard.html'
})
export class Dashboard {
	private readonly route = inject(ActivatedRoute);
	private readonly routeDataService = inject(RouteDataService);

	private routeData = toSignal(this.route.data as Observable<RouteMeta>, {
		initialValue: { title: '', subTitle: '', icon: '' }
	});

	constructor() {
		effect(() => {
			this.routeDataService.setRouteData(this.routeData());
		});
	}
}
