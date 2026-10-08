import { Component, computed, effect, inject, model, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { APP_ICONS_MAP } from '../../../../../lucide-icons';
import { MenuStore } from '../../../stores/menu-store';
import { MenuField } from '../../../models/menu';
import { form, FormField, required, schema, Schema } from '@angular/forms/signals';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideDynamicIcon, LucideIcon } from '@lucide/angular';
import { PermissionStore } from '../../../stores/permission-store';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { PermissionField } from '../../../models/permission';
import { MenuService } from '../../../services/menu-service';

@Component({
  selector: 'qfin-menu-detail-component',
  imports: [
    FormField,
    CommonModule,
    MatCheckboxModule,
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
  menuService = inject(MenuService);
  alertService = inject(AlertService);

  menuId = model<string>('');
  cancel = output<void>();
  /** Emits the id of the menu just saved, so the page keeps it selected in the tree. */
  saved = output<string>();
  readonly iconMap = APP_ICONS_MAP;

  //   parentMenus = this.menuStore.parentMenusByUser;
  parentMenus = this.menuStore.parentMenus;
  permissions = signal<PermissionField[]>([]); //this.permissionStore.permissions;
  menu = this.menuStore.menu;
  /** An existing menu is being edited; drives the header and the active-flag checkbox. */
  isEditMode = computed(() => this.menuId() !== EMPTY_UUID);
  mode = computed(() => (this.isEditMode() ? 'Edit' : 'Add'));
  buttonText = computed(() => (this.isEditMode() ? 'Update' : 'Create'));

  enabledPermissionsCount = computed(
    () => this.menuModel().permissions.filter((p) => p.checked).length,
  );

  enabledPermissionsLabel = computed(() => {
    const names = this.menuModel()
      .permissions.filter((p) => p.checked)
      .map((p) => p.permissionToken);
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
      this.menuStore.setShouldLoadParentMenus(true);
    });

    effect(() => {
      const menu = this.menu();
      const allPermissions = this.permissionStore.permissions();

      if (!allPermissions) return;

      if (this.menuId() === EMPTY_UUID) {
        this.menuModel.set({
          id: EMPTY_UUID,
          name: '',
          icon: '',
          target: '',
          parentId: '',
          displayPosition: 0,
          isActive: true,
          permissions: allPermissions.map((p) => ({
            ...p,
            checked: false,
          })),
        });

        return;
      }

      if (!menu) return;

      const selectedTokens = new Set(menu.permissions.map((p) => p.permissionToken));

      this.menuModel.set({
        ...menu,
        target: menu.target ?? '',
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

    const dataToSave = {
      ...this.menuForm().value(),
      //target: this.menuForm().value().target || null,
      // The active flag is only editable on update; a new menu is always created active.
      isActive: this.isEditMode() ? this.menuForm.isActive().value() : true,
      permissions: this.menuForm()
        .value()
        .permissions.filter((p) => p.checked),
    };

    if (this.menuId() === EMPTY_UUID) {
      this.menuService.create(dataToSave).subscribe({
        next: (resp) => {
          this.alertService.success('Success!', 'Menu saved successfully !');
          this.menuStore.refreshTree();
          this.menuStore.refreshMenu();
          this.saved.emit(resp?.id ?? EMPTY_UUID);
        },
        error: (err: any) => {
          if (err.error.isError) {
          }
        },
      });
    } else {
      const savedId = this.menuId();
      this.menuService.update(savedId, dataToSave).subscribe({
        next: () => {
          this.alertService.success('Success!', 'Menu updated successfully !');
          this.menuStore.refreshTree();
          this.menuStore.refreshMenu();
          this.saved.emit(savedId);
        },
        error: (err: any) => {
          if (err.error.isError) {
          }
        },
      });
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}
