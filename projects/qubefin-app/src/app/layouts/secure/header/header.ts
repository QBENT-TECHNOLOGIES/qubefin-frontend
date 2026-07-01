import { Component, computed, inject, model } from '@angular/core';
import { RouteDataService } from 'qubefin-core';

@Component({
	selector: 'qfin-header',
	imports: [],
	templateUrl: './header.html'
})
export class Header {
	routeDataService = inject(RouteDataService);

	isExpanded = model<boolean>(true);

	pageTitle = computed(() => this.routeDataService.routeData().title);
	pageSubTitle = computed(() => this.routeDataService.routeData().subTitle);
	pageIcon = computed(() => this.routeDataService.routeData().icon);

	onHandleToggleDrawer() {
		this.isExpanded.set(!this.isExpanded());
	}

}
