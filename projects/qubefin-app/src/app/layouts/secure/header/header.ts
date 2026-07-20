import { Component, inject, input, model } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { ThemeService } from '../../../services/theme.service';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { APP_ICONS_MAP } from '../../../lucide-icons';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Breadcrumb } from "../breadcrumb/breadcrumb";
import { Menu } from '../../../features/app/models/menu';

@Component({
	selector: 'qfin-header',
	standalone: true,
	imports: [MatDividerModule, LucideDynamicIcon, MatMenuModule, MatTooltipModule, Breadcrumb],
	templateUrl: './header.html'
})
export class Header {
	theme = inject(ThemeService);

	pageData = input<Menu | null>(null);

	isExpanded = model<boolean>(true);
	readonly iconMap = APP_ICONS_MAP;

	onHandleToggleDrawer() {
		this.isExpanded.set(!this.isExpanded());
	}
}