import { Component, computed, inject, model } from '@angular/core';
import { RouteDataService } from 'qubefin-core';
import { LucideSun, LucideMoon, LucideBell, LucidePanelLeftClose, LucidePanelLeftOpen, LucideCircleQuestionMark } from '@lucide/angular';
import { ThemeService } from '../../../services/theme.service';
import {MatMenuModule} from '@angular/material/menu';
@Component({
	selector: 'qfin-header',
	standalone: true,
	imports: [LucideSun, LucideMoon, LucideBell, LucidePanelLeftClose, LucidePanelLeftOpen, LucideCircleQuestionMark, MatMenuModule],
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