import { Component, effect, inject, signal } from '@angular/core';
import { EMPTY_UUID } from 'qubefin-core';
import { MenuStore } from '../../stores/menu-store';
import { MenuTreeComponent } from '../../components/menu-tree/menu-tree';
import { MenuViewComponent } from '../../components/menu-view/menu-view';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { LucideDynamicIcon } from '@lucide/angular';
import { MenuDetailComponent } from '../../components/menu-detail/menu-detail';

@Component({
  selector: 'qfin-menu-page',
  imports: [MenuTreeComponent, MenuViewComponent, MenuDetailComponent, LucideDynamicIcon],
  templateUrl: './menu.html'
})
export class MenuPage {
	menuStore = inject(MenuStore);

	isViewMode = signal<boolean>(true);
	selectedMenuId = signal<string>(EMPTY_UUID);
	menuTreeNodes = this.menuStore.menuTree;
	readonly iconMap = APP_ICONS_MAP;
	constructor() {
		effect(() => {
			if (this.menuTreeNodes().length > 0) {
				this.selectedMenuId.set(this.menuTreeNodes()[0].id);
			}
		});
	}

	protected onAdd() {
		this.isViewMode.set(false);
		this.selectedMenuId.set(EMPTY_UUID);
	}

	protected viewDetail(id: string) {
		this.selectedMenuId.set(id);
	}

	protected onEdit() {
		this.isViewMode.set(false);
	}
}
