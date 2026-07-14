import { httpResource } from "@angular/common/http";
import { computed, Injectable, signal } from "@angular/core";
import { ApiPaths, EMPTY_UUID } from "qubefin-core";
import { OrganizationUnitTreeNode } from "../models/organization-unit-tree-node";
import { OrganizationUnit } from "../models/organization-unit";

@Injectable({
    providedIn: 'root'
})
export class OrganizationUnitStore {
    // Internal State
    private readonly organizationUnitId = signal<string | undefined>(undefined);

    // All Organization Units as Tree
    organizationUnitTreeResource = httpResource<OrganizationUnitTreeNode[]>(() => `${ApiPaths.GLOBAL}/organization-units/tree`);

    readonly organizationUnitTree = computed(() => this.organizationUnitTreeResource.value() ?? []);
    readonly loading = computed(() => this.organizationUnitTreeResource.isLoading());
    readonly error = computed(() => this.organizationUnitTreeResource.error());

    // Single Organization Unit
    private readonly organizationUnitResource = httpResource<OrganizationUnit>(() => {
        const id = this.organizationUnitId();
        if (!id || id === EMPTY_UUID) return undefined;
        return `${ApiPaths.GLOBAL}/organization-units/${id}`;
    });

    readonly organizationUnit = computed(() => this.organizationUnitResource.value() ?? undefined);
    readonly organizationUnitLoading = computed(() => this.organizationUnitResource.isLoading());
    readonly organizationUnitError = computed(() => this.organizationUnitResource.error());

    // Actions
    setOrganizationUnitId(organizationUnitId: string | undefined) {
        if (this.organizationUnitId() === organizationUnitId) return;
        this.organizationUnitId.set(organizationUnitId);
    }
}