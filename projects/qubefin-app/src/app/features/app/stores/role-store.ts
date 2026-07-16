import { httpResource } from "@angular/common/http";
import { computed, Injectable, signal } from "@angular/core";
import { ApiPaths, EMPTY_UUID } from "qubefin-core";
import { Role } from "../models/role";

@Injectable({
    providedIn: 'root'
})
export class RoleStore {
    // Internal State
    private readonly roleId = signal<string | undefined>(undefined);

    // All Roles
    rolesResource = httpResource<Role[]>(() => `${ApiPaths.APP}/roles`);

    readonly roles = computed(() => this.rolesResource.value() ?? []);
    readonly loading = computed(() => this.rolesResource.isLoading());
    readonly error = computed(() => this.rolesResource.error());

    // Single Role
    private readonly roleResource = httpResource<Role>(() => {
        const id = this.roleId();
        if (!id || id === EMPTY_UUID) return undefined;
        return `${ApiPaths.APP}/roles/${id}`;
    });

    readonly role = computed(() => this.roleResource.value() ?? undefined);
    readonly roleLoading = computed(() => this.roleResource.isLoading());
    readonly roleError = computed(() => this.roleResource.error());

    // Actions
    setRoleId(roleId: string | undefined) {
        if (this.roleId() === roleId) return;
        this.roleId.set(roleId);
    }
}