import { httpResource } from "@angular/common/http";
import { computed, Injectable } from "@angular/core";
import { ApiPaths } from "qubefin-core";
import { OrganizationUnitType } from "../models/organization-unit-type";

@Injectable({
    providedIn: 'root'
})
export class OrganizationUnitTypeStore {
    organizationUnitTypeTreeResource = httpResource<OrganizationUnitType[]>(() => `${ApiPaths.GLOBAL}/organization-unit-types`);

    readonly organizationUnitTypes = computed(() => this.organizationUnitTypeTreeResource.value() ?? []);
    readonly loading = computed(() => this.organizationUnitTypeTreeResource.isLoading());
    readonly error = computed(() => this.organizationUnitTypeTreeResource.error());
}