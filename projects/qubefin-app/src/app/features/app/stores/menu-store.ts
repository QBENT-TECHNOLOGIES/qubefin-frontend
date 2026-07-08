import { httpResource } from "@angular/common/http";
import { computed, Injectable, signal } from "@angular/core";
import { ApiPaths, EMPTY_UUID } from "qubefin-core";
import { MenuTreeNode } from "../models/menu-tree-node";
import { Menu } from "../models/menu";

@Injectable({
    providedIn: 'root'
})
export class MenuStore {
    // Internal State
    private readonly menuId = signal<string | undefined>(undefined);

    // All Menus as Tree
    menuTreeResource = httpResource<MenuTreeNode[]>(() => `${ApiPaths.APP}/menus/tree`);

    readonly menuTree = computed(() => this.menuTreeResource.value() ?? []);
    readonly loading = computed(() => this.menuTreeResource.isLoading());
    readonly error = computed(() => this.menuTreeResource.error());

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
}