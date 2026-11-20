import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';

@Injectable({
  providedIn: 'root',
})
export class DepartmentService {
  httpClient = inject(HttpClient);
  getDepartmentById(id: any) {
    return this.httpClient.get(`${ApiPaths.HRMS}/departments/${id}`);
  }
  createDepartment(department: any) {
    return this.httpClient.post(`${ApiPaths.HRMS}/departments`, department);
  }
  updateDepartment(id: any, department: any) {
    return this.httpClient.put(`${ApiPaths.HRMS}/departments/${id}`, department);
  }
}
