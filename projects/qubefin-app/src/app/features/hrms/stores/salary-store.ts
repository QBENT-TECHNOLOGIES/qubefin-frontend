import { httpResource } from "@angular/common/http";
import { computed, Injectable, signal } from "@angular/core";
import { ISalaryModel, SalaryCategories } from "../models/salary";
import { ApiPaths, EMPTY_UUID } from "qubefin-core";

@Injectable({
    providedIn: 'root'
})
export class SalaryStore {
    private readonly salaryComponentId = signal<string | undefined>(undefined);
    salaryComponentsResource = httpResource<{ salaryComponents: ISalaryModel[] }>(
        () => `${ApiPaths.HRMS}/salary-components`
    );
    readonly salaryComponents = computed(() =>
        this.salaryComponentsResource.value()?.salaryComponents ?? []
    );

    readonly loading = computed(() => this.salaryComponentsResource.isLoading());
    readonly error = computed(() => this.salaryComponentsResource.error());
    private readonly salaryComponentResource = httpResource<{ salaryComponent: ISalaryModel }>(() => {
        const id = this.salaryComponentId();
        if (!id || id === EMPTY_UUID) return undefined;
        return `${ApiPaths.HRMS}/salary-components/${id}`;
    });
    readonly salaryComponent = computed(() => this.salaryComponentResource.value()?.salaryComponent ?? undefined);
    readonly salaryComponentLoading = computed(() => this.salaryComponentResource.isLoading());
    readonly salaryComponentError = computed(() => this.salaryComponentResource.error());

    private readonly shouldFetchCategories = signal<boolean>(false);
    private readonly categoriesResource = httpResource<{ salaryComponentCategories: any[] }>(() => {
        if (!this.shouldFetchCategories()) {
            return undefined;
        }
        return `${ApiPaths.HRMS}/salary-components/categories`;
    });
    readonly categories = computed(() =>
        this.categoriesResource.value()?.salaryComponentCategories ?? []
    );
    loadCategories() {
        this.shouldFetchCategories.set(true);
    } 
    setSalaryComponentId(id: string | undefined) {
        if (this.salaryComponentId() === id) return;
        this.salaryComponentId.set(id);
    }
    refreshList() {
        this.salaryComponentsResource.reload();
    }
    refreshDetail() {
        this.salaryComponentResource.reload();
    }
}