import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { MenuTreeNode, ParentMenu } from '../models/menu';
import { Menu } from '../models/menu';

@Injectable({
  providedIn: 'root',
})
export class MenuStore {
  // Internal State
  private readonly menuId = signal<string | undefined>(undefined);
  private readonly shouldLoadmenuTree = signal<boolean>(false);
  private readonly shouldLoadmenuTreeByUser = signal<boolean>(false);
  private readonly shouldLoadParentMenus = signal<boolean>(false);
  private readonly shouldLoadParentMenusByUser = signal<boolean>(false);

  // All Menus as Tree
  menuTreeResource = httpResource<MenuTreeNode[]>(() => {
    if (!this.shouldLoadmenuTree()) return undefined;
    return `${ApiPaths.APP}/menus/tree`;
  });

  readonly menuTree = computed(() => this.menuTreeResource.value() ?? []);
  readonly loading = computed(() => this.menuTreeResource.isLoading());
  readonly error = computed(() => this.menuTreeResource.error());

  //Menus as Tree By User
  menuTreeByUserResource = httpResource<MenuTreeNode[]>(() => {
    if (!this.shouldLoadmenuTreeByUser()) return undefined;
    return `${ApiPaths.APP}/menus/tree-by-user`;
  });

  readonly menuTreeByUser = computed(() => this.menuTreeByUserResource.value() ?? []);
  readonly menuTreeByUserLoading = computed(() => this.menuTreeByUserResource.isLoading());
  readonly menuTreeByUserError = computed(() => this.menuTreeByUserResource.error());

  // All Parent Menus
  parentMenusResource = httpResource<ParentMenu[]>(() => {
    if (!this.shouldLoadParentMenus()) return undefined;
    return `${ApiPaths.APP}/menus/parent-only`;
  });

  readonly parentMenus = computed(() => this.parentMenusResource.value() ?? []);
  readonly parentMenusLoading = computed(() => this.parentMenusResource.isLoading());
  readonly parentMenusError = computed(() => this.parentMenusResource.error());

  // Parent Menus by User
  parentMenusByUserResource = httpResource<ParentMenu[]>(() => {
    if (!this.shouldLoadParentMenusByUser()) return undefined;
    return `${ApiPaths.APP}/menus/parent-only-by-user`;
  });

  readonly parentMenusByUser = computed(() => {
    return this.parentMenusByUserResource.value() ?? [];
  });
  readonly parentMenusByUserLoading = computed(() => this.parentMenusByUserResource.isLoading());
  readonly parentMenusByUserError = computed(() => this.parentMenusByUserResource.error());

  // Single Menu
  private readonly menuResource = httpResource<Menu>(() => {
    const id = this.menuId();
    if (!id || id === EMPTY_UUID) return undefined;
    return `${ApiPaths.APP}/menus/${id}`;
  });

  readonly menu = computed(() => this.menuResource.value() ?? undefined);
  readonly menuLoading = computed(() => this.menuResource.isLoading());
  readonly menuError = computed(() => this.menuResource.error());

  // Actions
  setMenuId(menuId: string | undefined) {
    if (this.menuId() === menuId) return;
    this.menuId.set(menuId);
  }

  refreshMenu() {
    const currentMenuId = this.menuId();
    this.menuId.set(undefined);
    setTimeout(() => {
      this.menuId.set(currentMenuId);
    });
  }

  setShouldLoadmenuTreeByUser(shouldLoad: boolean) {
    this.shouldLoadmenuTreeByUser.set(shouldLoad);
  }

  setShouldLoadmenuTree(shouldLoad: boolean) {
    this.shouldLoadmenuTree.set(shouldLoad);
  }

  setShouldLoadParentMenus(shouldLoad: boolean) {
    this.shouldLoadParentMenus.set(shouldLoad);
  }

  setShouldLoadParentMenusByUser(shouldLoad: boolean) {
    this.shouldLoadParentMenusByUser.set(shouldLoad);
  }
}
