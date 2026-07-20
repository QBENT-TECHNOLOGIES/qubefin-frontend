import { Component, effect, inject, signal } from '@angular/core';
import { EMPTY_UUID } from 'qubefin-core';
import { MenuStore } from '../../stores/menu-store';
import { MenuTreeComponent } from '../../components/menu-tree/menu-tree';
import { MenuViewComponent } from '../../components/menu-view/menu-view';

@Component({
  selector: 'qfin-menu-page',
  imports: [MenuTreeComponent, MenuViewComponent],
  templateUrl: './menu.html'
})
export class MenuPage {
	menuStore = inject(MenuStore);

	isViewMode = signal<boolean>(true);
	selectedMenuId = signal<string>(EMPTY_UUID);
	menuTreeNodes = this.menuStore.menuTree;

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
