import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { IDepartment } from '../models/department';
@Injectable({
  providedIn: 'root',
})
export class DepartmentStore {
  private readonly basePath = `${ApiPaths.HRMS}/departments`;
  private readonly departmentId = signal<string | undefined>(undefined);

  private readonly departmentsResource = httpResource<IDepartment[]>(() => {
    return `${this.basePath}`;
  });

  readonly departments = computed<IDepartment[]>(() => this.departmentsResource.value() ?? []);

  readonly departmentsLoading = computed(() => this.departmentsResource.isLoading());
  readonly departmentsError = computed(() => this.departmentsResource.error());

  readonly departmentResource = httpResource<IDepartment>(() => {
    const id = this.departmentId();

    return id && id !== EMPTY_UUID ? `${this.basePath}/${id}` : undefined;
  });

  readonly department = computed(() => {
    const item = this.departmentResource.value();
    return item ? item : undefined;
  });

  readonly departmentLoading = computed(() => this.departmentResource.isLoading());
  readonly departmentError = computed(() => this.departmentResource.error());
  setDepartmentId(id: string | undefined) {
    if (this.departmentId() !== id) {
      this.departmentId.set(id);
    }
  }
  refreshList() {
    this.departmentsResource.reload();
  }
  refreshDetail() {
    this.departmentResource.reload();
  }
}
