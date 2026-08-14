import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import {
  IEmployeePersonalInfo,
  IEmployeesBySearchResult,
  KycDocument,
  Utility,
} from '../models/employee-detail';

@Injectable({
  providedIn: 'root',
})
export class EmployeeStore {
  // --- Detail State ---
  private readonly employeeComponentId = signal<string | undefined>(undefined);
  // 1. Keep track of the active step index

  // --- Pagination & Filtering State ---
  readonly searchQuery = signal<string>('');
  readonly srchJoiningDate = signal<string | null>(null);
  readonly pageIndex = signal<number>(0);
  readonly pageSize = signal<number>(10);
  readonly sortOn = signal<string>('name');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');

  // --- List Resource (Updated to match your response model) ---
  employeeListComponentsResource = httpResource<{
    employees: IEmployeesBySearchResult[];
    totalRecords: number;
  }>(() => {
    const search = encodeURIComponent(this.searchQuery());
    const page = this.pageIndex();
    const size = this.pageSize();
    const sort = this.sortOn();
    const dir = this.sortDirection();
    const srchJoiningDate = this.srchJoiningDate();

    let url = `${ApiPaths.HRMS}/employees/search?searchType=all&searchText=${search}&sortOn=${sort}&sortDirection=${dir}&pageIndex=${page}&pageSize=${size}`;

    if (srchJoiningDate) {
      url += `&srchJoiningDate=${srchJoiningDate}`;
    }

    return url;
  });

  // Safely extracts the employees array from the root response model
  readonly employeeListComponents = computed(
    () => this.employeeListComponentsResource.value()?.employees ?? [],
  );

  // Pulls the total records directly from the API response payload
  readonly totalRecords = computed(
    () => this.employeeListComponentsResource.value()?.totalRecords ?? 0,
  );

  // Computes the mathematical maximum total pages based on page sizes
  readonly totalPages = computed(() => Math.ceil(this.totalRecords() / this.pageSize()));

  readonly loading = computed(() => this.employeeListComponentsResource.isLoading());
  readonly error = computed(() => this.employeeListComponentsResource.error());
  // --- View Resource ---
  private readonly employeeInfoComponentResource = httpResource<{
    personalInfo: IEmployeePersonalInfo;
  }>(() => {
    const id = this.employeeComponentId();
    console.log(id);
    if (!id || id === EMPTY_UUID) return undefined;
    return `${ApiPaths.HRMS}/employees/${id}`;
  });

  readonly employeeInfoComponent = computed(
    () => this.employeeInfoComponentResource.value()?.personalInfo ?? undefined,
  );
  readonly employeeInfoComponentLoading = computed(() =>
    this.employeeInfoComponentResource.isLoading(),
  );
  readonly employeeInfoComponentError = computed(() => this.employeeInfoComponentResource.error());

  // // --- Personal Resource ---
  // private readonly personalInfoComponentResource = httpResource<{ personalInfo: IEmployeePersonalInfo }>(() => {
  //   const id = this.employeeComponentId();
  //   console.log(id);
  //   if (!id || id === EMPTY_UUID) return undefined;
  //   return `${ApiPaths.HRMS}/employees/personal-details/${id}`;
  // });

  // readonly personalInfoComponent = computed(() => this.personalInfoComponentResource.value()?.personalInfo ?? undefined);
  // readonly personalInfoComponentLoading = computed(() => this.personalInfoComponentResource.isLoading());
  // readonly personalInfoComponentError = computed(() => this.personalInfoComponentResource.error());

  // // --- Address Resource ---
  // private readonly addressInfoComponentResource = httpResource<{ addressInfo: IEmployeeAddressInfo }>(() => {
  //   const id = this.employeeComponentId();
  //   console.log(id);
  //   if (!id || id === EMPTY_UUID) return undefined;
  //   return `${ApiPaths.HRMS}/employees/address-details/${id}`;
  // });

  // readonly addressInfoComponent = computed(() => this.addressInfoComponentResource.value()?.addressInfo ?? undefined);
  // readonly addressInfoComponentLoading = computed(() => this.addressInfoComponentResource.isLoading());
  // readonly addressInfoComponentError = computed(() => this.addressInfoComponentResource.error());

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
    // this.pageIndex.set(0);
  }

  setSort(field: string, direction: 'asc' | 'desc') {
    this.sortOn.set(field);
    this.sortDirection.set(direction);
  }

  setEmployeeComponentId(id: string | undefined) {
    if (this.employeeComponentId() === id) return;
    this.employeeComponentId.set(id);
  }
  setSearchJoiningDate(date: string | null) {
    this.srchJoiningDate.set(date);
    this.pageIndex.set(0);
  }
  refreshList() {
    this.employeeListComponentsResource.reload();
  }
  refreshDetail() {
    this.employeeInfoComponentResource.reload();
  }
  // refreshPersonalInfoDetail() {
  //   this.personalInfoComponentResource.reload();
  // }
  // refreshAddressInfoDetail() {
  //   this.personalInfoComponentResource.reload();
  // }

  // --- UTILITY SERVICE ---
  private readonly utilityResource = httpResource<Utility[]>(() => {
    return `${ApiPaths.GLOBAL}/utilities`;
  });

  readonly utilityComponent = computed<Utility[]>(() => this.utilityResource.value() ?? []);

  readonly utilityComponentLoading = computed(() => this.utilityResource.isLoading());
  readonly utilityComponentError = computed(() => this.utilityResource.error());

  // --- KYC DOCUMENT TYPE SERVICE ---
  private readonly KycResource = httpResource<KycDocument[]>(() => {
    return `${ApiPaths.GLOBAL}/kyc-documents`;
  });

  readonly kycComponent = computed<KycDocument[]>(() => this.KycResource.value() ?? []);

  readonly kycComponentLoading = computed(() => this.KycResource.isLoading());
  readonly kycComponentError = computed(() => this.KycResource.error());
}
