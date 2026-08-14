import { httpResource } from '@angular/common/http';
import { computed, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { IComapnyList } from '../models/company';

@Injectable({
  providedIn: 'root',
})
export class CompanyStore {
  private readonly companiesResource = httpResource<IComapnyList[]>(
    () => `${ApiPaths.GLOBAL}/companies`,
  );
  readonly companies = computed(() => this.companiesResource.value() ?? []);
  readonly loading = computed(() => this.companiesResource.isLoading());
}
