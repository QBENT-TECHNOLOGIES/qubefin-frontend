import { ISalaryModel } from './../models/salary';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';

@Injectable({
  providedIn: 'root',
})
export class SalaryComponentService {
  httpClient = inject(HttpClient);
  getAll() {
    return this.httpClient.get(`${ApiPaths.HRMS}/salary-components `);
  }
  getById(id: string) {
    return this.httpClient.get(`${ApiPaths.HRMS}/salary-components/${id}`);
  }
  create(salaryRequest: ISalaryModel) {
    return this.httpClient.post(`${ApiPaths.HRMS}/salary-components`, salaryRequest);
  }
  update(id: string, salaryRequest: ISalaryModel) {
    return this.httpClient.put(`${ApiPaths.HRMS}/salary-components/${id}`, salaryRequest);
  }
  getAllCategories() {
    return this.httpClient.get(`${ApiPaths.HRMS}/salary-components/categories`);
  }
}
