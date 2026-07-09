import { Component, computed, inject, model } from '@angular/core';
import { RouteDataService } from 'qubefin-core';
import { LucideSun, LucideMoon, LucideBell, LucidePanelLeftClose, LucideCircleQuestionMark } from '@lucide/angular';
import { ThemeService } from '../../../services/theme.service';
@Component({
	selector: 'qfin-header',
	standalone: true,
	imports: [LucideSun, LucideMoon, LucideBell, LucidePanelLeftClose, LucideCircleQuestionMark],
	templateUrl: './header.html'
})
export class Header {
	routeDataService = inject(RouteDataService);

	theme = inject(ThemeService);

	isExpanded = model<boolean>(true);

	pageTitle = computed(() => this.routeDataService.routeData().title);
	pageSubTitle = computed(() => this.routeDataService.routeData().subTitle);
	pageIcon = computed(() => this.routeDataService.routeData().icon);

	onHandleToggleDrawer() {
		this.isExpanded.set(!this.isExpanded());
	}
}