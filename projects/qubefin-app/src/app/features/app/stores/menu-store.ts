import { httpResource } from "@angular/common/http";
import { computed, Injectable, signal } from "@angular/core";
import { ApiPaths, EMPTY_UUID } from "qubefin-core";
import { MenuTreeNode } from "../models/menu-tree-node";

@Injectable({
    providedIn: 'root'
})
export class MenuStore {
    // Internal State
    private readonly menuId = signal<string | undefined>(undefined);

    // All Administrative Units as Tree
    menuTreeResource = httpResource<MenuTreeNode[]>(() => `${ApiPaths.APP}/menus/tree`);

    readonly menuTree = computed(() => this.menuTreeResource.value() ?? []);
    readonly loading = computed(() => this.menuTreeResource.isLoading());
    readonly error = computed(() => this.menuTreeResource.error());

    // Single Administrative Unit
    // private readonly menuResource = httpResource<MenuRequest>(() => {
    //     const id = this.menuId();
    //     if (!id || id === EMPTY_UUID) return undefined;
    //     return `${ApiPaths.GLOBAL}/administrative-units/${id}`;
    // });

    // readonly menu = computed(() => this.menuResource.value() ?? undefined);
    // readonly menuLoading = computed(() => this.menuResource.isLoading());
    // readonly menuError = computed(() => this.menuResource.error());

    // Actions
    setMenuId(menuId: string | undefined) {
        if (this.menuId() === menuId) return;
        this.menuId.set(menuId);
    }
}