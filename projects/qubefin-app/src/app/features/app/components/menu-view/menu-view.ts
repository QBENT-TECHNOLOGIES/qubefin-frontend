import { Component, effect, inject, model, output } from '@angular/core';
import { MenuStore } from '../../stores/menu-store';
import { EMPTY_UUID } from 'qubefin-core';
import { LucideDynamicIcon, LucideEye,
  LucidePlus,
  LucidePencil,
  LucideTrash2,
  LucideDownload} from '@lucide/angular';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { DatePipe } from '@angular/common';

@Component({
	selector: 'qfin-menu-view-component',
	imports: [DatePipe, LucideDynamicIcon],
	templateUrl: './menu-view.html'
})
export class MenuViewComponent {
	menuStore = inject(MenuStore);

	menuId = model<string>(EMPTY_UUID);
	readonly iconMap = APP_ICONS_MAP;

	showEdit = output<boolean>();

	menu = this.menuStore.menu;

	readonly permissionIconMap: Record<string, any> = {
		VIEW: LucideEye,
		ADD: LucidePlus,
		EDIT: LucidePencil,
		DELETE: LucideTrash2,
		EXPORT: LucideDownload,
	};

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
