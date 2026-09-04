import { Component, computed, effect, inject, model, output, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertService, EMPTY_UUID } from 'qubefin-core';
import {
  LucideDynamicIcon,
  LucideDownload,
  LucideEye,
  LucidePencil,
  LucidePlus,
  LucideTrash2,
} from '@lucide/angular';
import { MatTableModule } from '@angular/material/table';
import { APP_ICONS_MAP } from '../../../../../lucide-icons';
import { MenuStore } from '../../../stores/menu-store';
import { MenuService } from '../../../services/menu-service';
import { EmployeeSearchByText } from '../../../../hrms/models/employee-search-by-text';
import { EmployeeService } from '../../../../hrms/services/employee-service';
import { RoleMenuAssignmentResponse, UserMenuAssignmentResponse } from '../../../models/menu';

@Component({
  selector: 'qfin-menu-view-component',
  imports: [CommonModule, DatePipe, FormsModule, MatTableModule, LucideDynamicIcon],
  templateUrl: './menu-view.html',
})
export class MenuViewComponent {
  private readonly menuService = inject(MenuService);
  private readonly employeeService = inject(EmployeeService);
  private readonly alertService = inject(AlertService);
  menuStore = inject(MenuStore);

  menuId = model<string>(EMPTY_UUID);
  readonly iconMap = APP_ICONS_MAP;

  showEdit = output<boolean>();

  menu = this.menuStore.menu;
  readonly roleAssignments = signal<RoleMenuAssignmentResponse[]>([]);
  readonly userAssignments = signal<UserMenuAssignmentResponse[]>([]);
  readonly isAllRolesSelected = computed(
    () =>
      this.roleAssignments().length > 0 && this.roleAssignments().every((role) => role.isSelected),
  );
  readonly isAllUsersSelected = computed(
    () =>
      this.userAssignments().length > 0 &&
      this.userAssignments().every((user) => user.isSelected ?? true),
  );
  readonly allPermissionIds = computed(() =>
    (this.menuStore.menu()?.permissions ?? []).map((permission) => permission.id),
  );
  readonly permissionColumns = computed(() =>
    (this.menuStore.menu()?.permissions ?? []).map((permission) => ({
      id: permission.id,
      permissionToken: permission.permissionToken,
    })),
  );
  readonly roleTableColumns = computed(() => [
    'select',
    'role',
    ...this.permissionColumns().map((permission) => `perm_${permission.id}`),
  ]);
  readonly userTableColumns = computed(() => [
    'select',
    'employee',
    ...this.permissionColumns().map((permission) => `perm_${permission.id}`),
    'action',
  ]);
  readonly employeeSearchText = signal('');
  readonly employeeSearchResults = signal<EmployeeSearchByText[]>([]);
  readonly isSaving = signal(false);
  readonly isSearchingEmployees = signal(false);

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

    effect(() => {
      const selectedMenu = this.menuStore.menu();
      if (!selectedMenu) {
        this.roleAssignments.set([]);
        this.userAssignments.set([]);
        return;
      }

      this.roleAssignments.set(
        (selectedMenu.roles ?? []).map((role) => {
          const isSelected = !!role.isSelected;
          return {
            ...role,
            menuPermissionIds: isSelected
              ? [
                  ...(role.menuPermissionIds?.length
                    ? role.menuPermissionIds
                    : this.allPermissionIds()),
                ]
              : [],
            isSelected,
          };
        }),
      );

      this.userAssignments.set(
        (selectedMenu.users ?? []).map((user) => {
          const isSelected = user.isSelected ?? true;
          return {
            ...user,
            menuPermissionIds: isSelected
              ? [
                  ...(user.menuPermissionIds?.length
                    ? user.menuPermissionIds
                    : this.allPermissionIds()),
                ]
              : [],
            isSelected,
          };
        }),
      );

      this.employeeSearchText.set('');
      this.employeeSearchResults.set([]);
    });
  }

  toggleAllRoleSelection(checked: boolean) {
    this.roleAssignments.update((current) =>
      current.map((role) => {
        const updatedRole = { ...role, isSelected: checked };
        updatedRole.menuPermissionIds = checked ? [...this.allPermissionIds()] : [];
        return updatedRole;
      }),
    );
  }

  toggleRoleSelection(index: number, checked: boolean) {
    this.roleAssignments.update((current) => {
      const updated = [...current];
      const role = { ...updated[index], isSelected: checked };
      role.menuPermissionIds = checked ? [...this.allPermissionIds()] : [];
      updated[index] = role;
      return updated;
    });
  }

  toggleRolePermission(roleIndex: number, permissionId: string, checked: boolean) {
    this.roleAssignments.update((current) => {
      const updated = [...current];
      const role = { ...updated[roleIndex] };
      const permissionIds = new Set(role.menuPermissionIds ?? []);

      if (checked) {
        permissionIds.add(permissionId);
      } else {
        permissionIds.delete(permissionId);
      }

      role.menuPermissionIds = Array.from(permissionIds);
      updated[roleIndex] = role;
      return updated;
    });
  }

  toggleAllUserSelection(checked: boolean) {
    this.userAssignments.update((current) =>
      current.map((user) => {
        const updatedUser = { ...user, isSelected: checked };
        updatedUser.menuPermissionIds = checked ? [...this.allPermissionIds()] : [];
        return updatedUser;
      }),
    );
  }

  toggleUserSelection(index: number, checked: boolean) {
    this.userAssignments.update((current) => {
      const updated = [...current];
      const user = { ...updated[index], isSelected: checked };
      user.menuPermissionIds = checked ? [...this.allPermissionIds()] : [];
      updated[index] = user;
      return updated;
    });
  }

  toggleUserPermission(userIndex: number, permissionId: string, checked: boolean) {
    this.userAssignments.update((current) => {
      const updated = [...current];
      const user = { ...updated[userIndex] };
      const permissionIds = new Set(user.menuPermissionIds ?? []);

      if (checked) {
        permissionIds.add(permissionId);
      } else {
        permissionIds.delete(permissionId);
      }

      user.menuPermissionIds = Array.from(permissionIds);
      updated[userIndex] = user;
      return updated;
    });
  }

  searchEmployees(searchText: string) {
    const trimmedValue = searchText.trim();
    this.employeeSearchText.set(trimmedValue);

    if (!trimmedValue) {
      this.employeeSearchResults.set([]);
      return;
    }

    this.isSearchingEmployees.set(true);
    this.employeeService.getEmployeesBySearchText({ searchText: trimmedValue }).subscribe({
      next: (results: EmployeeSearchByText[] | any) => {
        this.employeeSearchResults.set((results ?? []).slice(0, 10));
        this.isSearchingEmployees.set(false);
      },
      error: () => {
        this.employeeSearchResults.set([]);
        this.isSearchingEmployees.set(false);
      },
    });
  }

  addEmployeeToLocalList(employee: EmployeeSearchByText) {
    const alreadyExists = this.userAssignments().some(
      (user) =>
        user.userId === employee.id ||
        user.employeeId === employee.id ||
        user.userName.toLowerCase() === employee.employeeName.toLowerCase(),
    );

    if (alreadyExists) {
      this.employeeSearchText.set('');
      this.employeeSearchResults.set([]);
      return;
    }

    this.userAssignments.update((current) => [
      {
        userId: employee.userId,
        employeeId: employee.id,
        userName: employee.employeeName,
        menuPermissionIds: [...this.allPermissionIds()],
        isSelected: true,
      },
      ...current,
    ]);

    this.employeeSearchText.set('');
    this.employeeSearchResults.set([]);
  }

  removeUserFromLocalList(index: number) {
    this.userAssignments.update((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  savePermissions() {
    if (this.isSaving()) {
      return;
    }

    const payload = {
      menuId: this.menuId(),
      roles: this.roleAssignments().map((role) => ({
        roleId: role.roleId,
        menuPermissionIds: role.isSelected ? (role.menuPermissionIds ?? []) : [],
      })),
      users: this.userAssignments()
        .filter((user) => user.isSelected ?? true)
        .map((user) => ({
          userId: user.userId,
          menuPermissionIds: user.menuPermissionIds ?? [],
        })),
    };

    this.isSaving.set(true);
    this.menuService.saveRoleMenuPermissions(payload).subscribe({
      next: () => {
        this.alertService.success('Success', 'Menu permissions updated successfully.').then(() => {
          this.menuStore.refreshMenu();
          this.isSaving.set(false);
        });
      },
      error: (error) => {
        this.isSaving.set(false);
        this.alertService.error(
          'Failed',
          error?.error?.message ?? 'Unable to save menu permissions.',
        );
      },
    });
  }

  onShowEdit() {
    this.showEdit.emit(true);
  }
}
