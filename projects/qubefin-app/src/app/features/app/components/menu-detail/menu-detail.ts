import { Component, computed, effect, inject, model, output, signal } from '@angular/core';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { MenuStore } from '../../stores/menu-store';
import { Menu, MenuField } from '../../models/menu';
import { form, FormField, required, schema, Schema } from '@angular/forms/signals';
import { EMPTY_UUID } from 'qubefin-core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideDynamicIcon } from '@lucide/angular';
import { PermissionStore } from '../../stores/permission-store';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Permission, PermissionField } from '../../models/permission';

@Component({
	selector: 'qfin-menu-detail-component',
	imports: [FormField, MatFormFieldModule, MatInputModule, MatSelectModule, MatSlideToggleModule, LucideDynamicIcon],
	templateUrl: './menu-detail.html'
})
export class MenuDetailComponent {
	permissionStore = inject(PermissionStore);
	menuStore = inject(MenuStore);

	menuId = model<string>('');
	cancel = output<void>();
	readonly iconMap = APP_ICONS_MAP;

	parentMenus = this.menuStore.parentMenus;
	permissions = signal<PermissionField[]>([]); //this.permissionStore.permissions;
	menu = this.menuStore.menu;
	mode = computed(() => this.menuId() === EMPTY_UUID ? "Add" : "Edit");

	constructor() {
		effect(() => {
			const id = this.menuId();
			this.menuStore.setMenuId(id);
		});

		effect(() => {
			const menu = this.menu();
			const allPermissions = this.permissionStore.permissions();

			if (!menu || !allPermissions) return;

			const selectedTokens = new Set(
				menu.permissions.map(p => p.permissionToken)
			);

			this.menuModel.set({
				...menu,
				permissions: allPermissions.map(permission => ({
					...permission,
					checked: selectedTokens.has(permission.permissionToken)
				}))
			});
		});
	}

	protected readonly menuModel = signal<MenuField>({
		id: '',
		name: '',
		icon: '',
		target: '',
		parentId: '',
		displayPosition: 0,
		isActive: true,
		permissions: []
	});
	protected readonly menuSchema: Schema<MenuField> = schema((path) => {
		required(path.name, { message: 'Menu Name is required' });
		required(path.icon, { message: 'Menu Icon is required' });
	});
	protected readonly menuForm = form(this.menuModel, this.menuSchema);

	onPermissionChanged(token: string, checked: boolean): void {
		this.menuModel.update(menu => ({
			...menu,
			permissions: menu.permissions.map(permission =>
				permission.permissionToken === token
					? { ...permission, checked }
					: permission
			)
		}));
	}

	onSubmit() {
		if (!this.menuForm().valid()) {
			return;
		}

		const dataToSave = this.menuForm().value();
		if (this.menuId() === EMPTY_UUID) {
			// this.administrativeUnitService.create(dataToSave).subscribe({
			// 	next: (resp: any) => {
			// 		this.administrativeUnitStore.refreshTree();
			// 	},
			// 	error: (err: any) => {
			// 		if (err.error.isError) {
			// 		}
			// 	}
			// });
		} else {
			// this.administrativeUnitService.update(this.administrativeUnitId(), dataToSave).subscribe({
			// 	next: (resp: any) => {
			// 		this.administrativeUnitStore.refreshTree();
			// 	},
			// 	error: (err: any) => {
			// 		if (err.error.isError) {
			// 		}
			// 	}
			// });
		}
	}

	onCancel() {
		this.cancel.emit();
	}
}
