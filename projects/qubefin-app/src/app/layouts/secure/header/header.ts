import { Component, computed, inject, model } from '@angular/core';
import { RouteDataService } from 'qubefin-core';
import { LucideDynamicIcon } from '@lucide/angular';
import { ThemeService } from '../../../services/theme.service';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { APP_ICONS_MAP } from '../../../lucide-icons';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Breadcrumb } from "../breadcrumb/breadcrumb";



@Component({
	selector: 'qfin-header',
	standalone: true,
	imports: [MatDividerModule, LucideDynamicIcon, MatMenuModule, MatTooltipModule, Breadcrumb],
	templateUrl: './header.html'
})
export class Header {
	routeDataService = inject(RouteDataService);

	theme = inject(ThemeService);

	isExpanded = model<boolean>(true);
	readonly iconMap = APP_ICONS_MAP;
	pageTitle = computed(() => this.routeDataService.routeData().title);
	pageSubTitle = computed(() => this.routeDataService.routeData().subTitle);
	pageIcon = computed(() => this.routeDataService.routeData().icon);

	onHandleToggleDrawer() {
		this.isExpanded.set(!this.isExpanded());
	}
}