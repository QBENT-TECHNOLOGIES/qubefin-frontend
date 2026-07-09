import { Component, effect, inject, model, output } from '@angular/core';
import { MenuStore } from '../../stores/menu-store';
import { EMPTY_UUID } from 'qubefin-core';

@Component({
	selector: 'qfin-menu-view-component',
	imports: [],
	templateUrl: './menu-view.html'
})
export class MenuViewComponent {
	menuStore = inject(MenuStore);

	menuId = model<string>(EMPTY_UUID);

	showEdit = output<boolean>();

	menu = this.menuStore.menu;

	constructor() {
		effect(() => {
			if (this.menuId()) {
				this.menuStore.setMenuId(this.menuId());
			}
		});
	}

	onShowEdit() {
		this.showEdit.emit(true);
	}
}
