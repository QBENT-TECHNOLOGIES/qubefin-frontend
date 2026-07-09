import { httpResource } from "@angular/common/http";
import { computed, Injectable, signal } from "@angular/core";
import { ISalaryModel } from "../models/salary";
import { ApiPaths, EMPTY_UUID } from "../../../../../../../dist/qubefin-core/types/qubefin-core";

@Injectable({
    providedIn: 'root'
})
export class SalaryStore {
    private readonly salaryComponentId = signal<string | undefined>(undefined);
    salaryComponentsResource = httpResource<ISalaryModel[]>(() => `${ApiPaths.HRMS}/salary-components`);

    readonly salaryComponents = computed(() => this.salaryComponentsResource.value() ?? []);
    readonly loading = computed(() => this.salaryComponentsResource.isLoading());
    readonly error = computed(() => this.salaryComponentsResource.error());
    private readonly salaryComponentResource = httpResource<ISalaryModel>(() => {
        const id = this.salaryComponentId();
        if (!id || id === EMPTY_UUID) return undefined;
        return `${ApiPaths.HRMS}/salary-components/${id}`;
    });
    readonly salaryComponent = computed(() => this.salaryComponentResource.value() ?? undefined);
    readonly salaryComponentLoading = computed(() => this.salaryComponentResource.isLoading());
    readonly salaryComponentError = computed(() => this.salaryComponentResource.error());
    setSalaryComponentId(id: string | undefined) {
        if (this.salaryComponentId() === id) return;
        this.salaryComponentId.set(id);
    }
    refreshList() {
        this.salaryComponentsResource.reload();
    }
}