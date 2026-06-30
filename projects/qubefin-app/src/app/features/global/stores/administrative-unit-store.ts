import { httpResource } from "@angular/common/http";
import { computed, Injectable } from "@angular/core";
import { ApiPaths } from "qubefin-core";
import { AdministrativeUnitTreeNode } from "../models/administrative-unit-tree-node";

@Injectable({
    providedIn: 'root'
})
export class AdministrativeUnitStore {
    administrativeUnitTreeResource = httpResource<AdministrativeUnitTreeNode[]>(() => `${ApiPaths.GLOBAL}/administrative-units/tree`);

    readonly administrativeUnitTree = computed(() => this.administrativeUnitTreeResource.value() ?? []);
    readonly loading = computed(() => this.administrativeUnitTreeResource.isLoading());
    readonly error = computed(() => this.administrativeUnitTreeResource.error());
}