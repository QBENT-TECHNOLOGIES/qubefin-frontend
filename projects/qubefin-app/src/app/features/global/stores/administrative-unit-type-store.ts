import { httpResource } from "@angular/common/http";
import { computed, Injectable } from "@angular/core";
import { ApiPaths } from "qubefin-core";
import { AdministrativeUnitType } from "../models/administrative-unit-type";

@Injectable({
    providedIn: 'root'
})
export class AdministrativeUnitTypeStore {
    // All Administrative Unit Types
    administrativeUnitTypeTreeResource = httpResource<AdministrativeUnitType[]>(() => `${ApiPaths.GLOBAL}/administrative-unit-types`);

    readonly administrativeUnitTypes = computed(() => this.administrativeUnitTypeTreeResource.value() ?? []);
    readonly loading = computed(() => this.administrativeUnitTypeTreeResource.isLoading());
    readonly error = computed(() => this.administrativeUnitTypeTreeResource.error());
}