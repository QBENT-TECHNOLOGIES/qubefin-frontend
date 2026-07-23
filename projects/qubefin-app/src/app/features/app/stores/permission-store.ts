import { httpResource } from "@angular/common/http";
import { computed, Injectable } from "@angular/core";
import { ApiPaths } from "qubefin-core";
import { Permission } from "../models/permission";

@Injectable({
    providedIn: 'root'
})
export class PermissionStore {
    // All Permissions
    permissionsResource = httpResource<Permission[]>(() => `${ApiPaths.APP}/permissions`);

    readonly permissions = computed(() => this.permissionsResource.value() ?? []);
    readonly permissionsLoading = computed(() => this.permissionsResource.isLoading());
    readonly permissionsError = computed(() => this.permissionsResource.error());
}