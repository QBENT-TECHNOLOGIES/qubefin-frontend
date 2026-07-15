import { httpResource } from "@angular/common/http";
import { computed, Injectable, signal } from "@angular/core";
import { ApiPaths, EMPTY_UUID } from "qubefin-core";
import { Employee, IEmployee, IEmployeePersonalInfo, IEmployeesBySearchResult } from "../models/employee-detail";

@Injectable({
  providedIn: 'root'
})
export class EmployeeStore {
  // --- Detail State ---
  private readonly employeeComponentId = signal<string | undefined>(undefined);

  // --- Pagination & Filtering State ---
  readonly searchQuery = signal<string>('');
  readonly pageIndex = signal<number>(0);
  readonly pageSize = signal<number>(10);
  readonly sortOn = signal<string>('name');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');

  // --- List Resource (Updated to match your response model) ---
  employeeListComponentsResource = httpResource<{ employees: IEmployeesBySearchResult[]; totalRecords: number }>(() => {
    const search = encodeURIComponent(this.searchQuery());
    const page = this.pageIndex();
    const size = this.pageSize();
    const sort = this.sortOn();
    const dir = this.sortDirection();

    return `${ApiPaths.HRMS}/employees/search?searchType=all&searchText=${search}&sortOn=${sort}&sortDirection=${dir}&pageIndex=${page}&pageSize=${size}`;
  });

  // Safely extracts the employees array from the root response model
  readonly employeeListComponents = computed(() => 
    this.employeeListComponentsResource.value()?.employees ?? []
  );

  // Pulls the total records directly from the API response payload
  readonly totalRecords = computed(() => 
    this.employeeListComponentsResource.value()?.totalRecords ?? 0
  );

  // Computes the mathematical maximum total pages based on page sizes
  readonly totalPages = computed(() => 
    Math.ceil(this.totalRecords() / this.pageSize())
  );

  readonly loading = computed(() => this.employeeListComponentsResource.isLoading());
  readonly error = computed(() => this.employeeListComponentsResource.error());

  // --- Detail Resource ---
  private readonly employeeInfoComponentResource = httpResource<{ personalInfo: IEmployeePersonalInfo }>(() => {
    const id = this.employeeComponentId();
    console.log(id);
    if (!id || id === EMPTY_UUID) return undefined;
    return `${ApiPaths.HRMS}/employees/${id}`;
  });

  readonly employeeInfoComponent = computed(() => this.employeeInfoComponentResource.value()?.personalInfo ?? undefined);
  readonly employeeInfoComponentLoading = computed(() => this.employeeInfoComponentResource.isLoading());
  readonly employeeInfoComponentError = computed(() => this.employeeInfoComponentResource.error());

  // --- State Setters ---
  setSearchQuery(query: string) {
    this.searchQuery.set(query);
    this.pageIndex.set(0); 
  }

  setPage(index: number) {
    this.pageIndex.set(index);
  }

  setPageSize(size: number) {
    this.pageSize.set(size);
    this.pageIndex.set(0); 
  }

  setSort(field: string, direction: 'asc' | 'desc') {
    this.sortOn.set(field);
    this.sortDirection.set(direction);
  }

  setEmployeeComponentId(id: string | undefined) {
    if (this.employeeComponentId() === id) return;
    this.employeeComponentId.set(id);
  }

  refreshList() {
    this.employeeListComponentsResource.reload();
  }

  refreshDetail() {
    this.employeeInfoComponentResource.reload();
  }
}
