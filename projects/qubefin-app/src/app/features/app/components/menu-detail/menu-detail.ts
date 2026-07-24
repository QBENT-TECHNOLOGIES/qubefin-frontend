import { Component, computed, effect, inject, model, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { MenuStore } from '../../stores/menu-store';
import { Menu, MenuField } from '../../models/menu';
import { form, FormField, required, schema, Schema } from '@angular/forms/signals';
import { EMPTY_UUID } from 'qubefin-core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideDynamicIcon, LucideIcon} from '@lucide/angular';
import { PermissionStore } from '../../stores/permission-store';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Permission, PermissionField } from '../../models/permission';

@Component({
  selector: 'qfin-menu-detail-component',
  imports: [
    FormField,
	CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    LucideDynamicIcon,
  ],
  templateUrl: './menu-detail.html',
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
  mode = computed(() => (this.menuId() === EMPTY_UUID ? 'Add' : 'Edit'));

 private readonly permissionMeta: Record<
  string,
  {
    label: string;
    description: string;
    icon: LucideIcon;
    bgClass: string;
    iconClass: string;
  }
> = {
  view: {
    label: 'View',
    description: 'View menu and data',
    icon: this.iconMap['Eye'],
    bgClass: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconClass: 'text-emerald-600 dark:text-emerald-400',
  },

  add: {
    label: 'Add',
    description: 'Add new records',
    icon: this.iconMap['FilePlus'],
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    iconClass: 'text-blue-600 dark:text-blue-400',
  },

  edit: {
    label: 'Edit',
    description: 'Edit existing records',
    icon: this.iconMap['FilePenLine'],
    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
    iconClass: 'text-amber-600 dark:text-amber-400',
  },

  delete: {
    label: 'Delete',
    description: 'Delete records',
    icon: this.iconMap['Trash2'],
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    iconClass: 'text-red-600 dark:text-red-400',
  },

  export: {
    label: 'Export',
    description: 'Export data',
    icon: this.iconMap['FileDown'],
    bgClass: 'bg-violet-100 dark:bg-violet-900/30',
    iconClass: 'text-violet-600 dark:text-violet-400',
  },
};

getPermissionMeta(token: string) {
  return (
    this.permissionMeta[token.toLowerCase()] ?? {
      label: token,
      description: '',
      icon: this.iconMap['ShieldCheck'],
      bgClass: 'bg-slate-100 dark:bg-slate-800',
      iconClass: 'text-slate-500',
    }
  );
}

  enabledPermissionsCount = computed(
    () => this.menuModel().permissions.filter((p) => p.checked).length,
  );

  enabledPermissionsLabel = computed(() => {
    const names = this.menuModel()
      .permissions.filter((p) => p.checked)
      .map((p) => this.getPermissionMeta(p.permissionToken).label);
    if (!names.length) return 'No';
    if (names.length === 1) return names[0];
    return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
  });

  constructor() {
    effect(() => {
      const id = this.menuId();
      this.menuStore.setMenuId(id);
    });

    effect(() => {
      const menu = this.menu();
      const allPermissions = this.permissionStore.permissions();

      if (!menu || !allPermissions) return;

      const selectedTokens = new Set(menu.permissions.map((p) => p.permissionToken));

      this.menuModel.set({
        ...menu,
        permissions: allPermissions.map((permission) => ({
          ...permission,
          checked: selectedTokens.has(permission.permissionToken),
        })),
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
    permissions: [],
  });
  protected readonly menuSchema: Schema<MenuField> = schema((path) => {
    required(path.name, { message: 'Menu Name is required' });
    required(path.icon, { message: 'Menu Icon is required' });
  });
  protected readonly menuForm = form(this.menuModel, this.menuSchema);

  onPermissionChanged(token: string, checked: boolean): void {
    this.menuModel.update((menu) => ({
      ...menu,
      permissions: menu.permissions.map((permission) =>
        permission.permissionToken === token ? { ...permission, checked } : permission,
      ),
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
