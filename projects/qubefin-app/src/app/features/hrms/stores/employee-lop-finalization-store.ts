import { httpResource } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  EmployeeLosDetails,
  EmployeeWiseCalculationResponse,
} from '../models/employee-lop-finalization';
import { ILeaveTypeBalance } from '../models/leave-request';

@Injectable({
  providedIn: 'root',
})
export class EmployeeLopFinalizationStore {
  private readonly basePath = `${ApiPaths.HRMS}/attendance-moralization`;
  private readonly http = inject(HttpClient);

  readonly year = signal<number>(new Date().getFullYear());
  readonly month = signal<number>(new Date().getMonth() + 1);
  readonly companyId = signal<string | null>(null);
  readonly organizationUnitId = signal<string | null>(null);
  readonly status = signal<number | null>(null);
  readonly searchQuery = signal<string | null>(null);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly sortOn = signal('employeeName');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');

  private readonly selectedId = signal<string | undefined>(undefined);
  private readonly selectedEmployeeId = signal<string | undefined>(undefined);

  readonly leaveTypeBalancesResource = httpResource<ILeaveTypeBalance[]>(() => {
    const employeeId = this.selectedEmployeeId();
    return employeeId ? `${ApiPaths.HRMS}/leave-types/balances/${employeeId}` : undefined;
  });

  readonly leaveTypeBalances = computed(
    () => this.leaveTypeBalancesResource.value()?.filter((m) => m.isEligible) ?? [],
  );

  readonly organizationUnitsResource = httpResource<{ id: string; name: string }[]>(
    () => `${ApiPaths.GLOBAL}/organization-units/all`,
  );

  readonly organizationUnits = computed(() => this.organizationUnitsResource.value() ?? []);

  readonly listResource = httpResource<{
    employees: EmployeeWiseCalculationResponse[];
    totalRecords: number;
  }>(() => ({
    url: `${this.basePath}`,
    method: 'POST',
    body: {
      year: this.year(),
      month: this.month(),
      companyId: this.companyId(),
      searchOrganizationUnitId: this.organizationUnitId(),
      status: this.status(),
      searchText: this.searchQuery(),
      sortOn: this.sortOn(),
      sortDirection: this.sortDirection(),
      pageIndex: this.pageIndex(),
      pageSize: this.pageSize(),
    },
  }));

  readonly listData = computed(() => this.listResource.value()?.employees ?? []);
  readonly totalRecords = computed(() => this.listResource.value()?.totalRecords ?? 0);
  readonly loading = computed(() => this.listResource.isLoading());
  readonly error = computed(() => this.listResource.error());

  readonly detailResource = httpResource<{ data: EmployeeLosDetails[] }>(() => {
    const id = this.selectedId();
    return id && id !== EMPTY_UUID ? `${this.basePath}/${id}` : undefined;
  });

  // The API returns Result<List<EmployeeLosDetails>> which usually maps to { data: ... } or just array based on standard setup. Let's assume it returns { data: EmployeeLosDetails[] } based on typical Result wrapper in Qubefin. If it returns array directly, we will adjust. Let's assume just standard array or wrapper.
  readonly detailData = computed(() => {
    const value = this.detailResource.value() as any;
    return (value?.data ?? value ?? []) as EmployeeLosDetails[];
  });
  readonly detailLoading = computed(() => this.detailResource.isLoading());
  readonly detailError = computed(() => this.detailResource.error());

  setYear(val: number) {
    this.year.set(val);
    this.pageIndex.set(0);
  }
  setMonth(val: number) {
    this.month.set(val);
    this.pageIndex.set(0);
  }
  setCompanyId(val: string | null) {
    this.companyId.set(val);
    this.pageIndex.set(0);
  }
  setOrganizationUnitId(val: string | null) {
    this.organizationUnitId.set(val);
    this.pageIndex.set(0);
  }
  setStatus(val: number | null) {
    this.status.set(val);
    this.pageIndex.set(0);
  }
  setSearchQuery(query: string | null) {
    this.searchQuery.set(query);
    this.pageIndex.set(0);
  }
  setPage(index: number) {
    this.pageIndex.set(index);
  }
  setPageSize(items: number) {
    this.pageSize.set(items);
  }
  setSort(sort: string, direction: 'asc' | 'desc') {
    this.sortOn.set(sort);
    this.sortDirection.set(direction);
    this.pageIndex.set(0);
  }

  setSelectedId(id: string | undefined) {
    this.selectedId.set(id);
  }

  setSelectedEmployeeId(employeeId: string | undefined) {
    this.selectedEmployeeId.set(employeeId);
  }

  refreshList() {
    this.listResource.reload();
  }

  refreshDetail() {
    this.detailResource.reload();
  }

  generateMoralization(): Observable<any> {
    return this.http.get(`${this.basePath}/generate/${this.month()}/${this.year()}`);
  }

  updateDetails(id: string, payload: EmployeeLosDetails[]): Observable<any> {
    return this.http.post(`${this.basePath}/update/${id}`, payload);
  }
}
