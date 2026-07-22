import { httpResource } from "@angular/common/http";
import { computed, Injectable, signal } from "@angular/core";
import { ApiPaths, EMPTY_UUID } from "qubefin-core";
import { Role, RoleSearchResult } from "../models/role";

@Injectable({
    providedIn: 'root'
})
export class RoleStore {
    // Internal State
    private roleState = signal({
        searchText: '',
        pageIndex: 0,
        pageSize: 10,
        sortOn: 'name',
        sortDirection: 'asc',
        roleId: EMPTY_UUID
    });

    // Selectors
    readonly searchParams = computed(() => {
        const searchState = this.roleState();
        return {
            searchText: searchState.searchText,
            pageIndex: searchState.pageIndex,
            pageSize: searchState.pageSize,
            sortOn: searchState.sortOn,
            sortDirection: searchState.sortDirection
        };
    });

    readonly hasRoleId = computed(() => this.roleState().roleId !== EMPTY_UUID);
    //private readonly roleId = signal<string | undefined>(undefined);

    // All Roles
    rolesResource = httpResource<Role[]>(() => `${ApiPaths.APP}/roles`);

    readonly roles = computed(() => this.rolesResource.value() ?? []);
    readonly loading = computed(() => this.rolesResource.isLoading());
    readonly error = computed(() => this.rolesResource.error());

    // Search Employees
    rolesSearchResource = httpResource<RoleSearchResult>(() => {
        const params = new URLSearchParams(this.searchParams() as any);
        return `${ApiPaths.APP}/roles/search?${params.toString()}`;
    });

    readonly searchedRoles = computed(() => this.rolesSearchResource.value() ?? {
        totalCount: 0,
        roles: []
    });
    readonly searchedLoading = computed(() => this.rolesSearchResource.isLoading());
    readonly searchedError = computed(() => this.rolesSearchResource.error());

    // Single Role
    private readonly roleResource = httpResource<Role>(() =>
        this.hasRoleId()
            ? `${ApiPaths.APP}/roles/${this.roleState().roleId}`
            : undefined
    );

    readonly role = computed(() => this.roleResource.value() ?? undefined);
    readonly roleLoading = computed(() => this.roleResource.isLoading());
    readonly roleError = computed(() => this.roleResource.error());

    // Actions
    updateStateParams(params: Partial<ReturnType<typeof this.roleState>>) {
        this.roleState.update(current => ({ ...current, ...params }));
    }

    setSort(sortOn: string, sortDirection: string) {
        this.updateStateParams({ sortOn, sortDirection });
    }

    setPagination = (page: number, count: number): void => this.updateStateParams({ pageIndex: page, pageSize: count });

    setPageIndex = (page: number): void => this.updateStateParams({ pageIndex: page });

    setPageSize = (itemCount: number): void => this.updateStateParams({ pageSize: itemCount });

    setRoleId(id: string | undefined) {
        this.updateStateParams({ roleId: id });
    }
}