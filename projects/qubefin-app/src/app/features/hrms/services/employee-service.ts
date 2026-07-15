import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { IEmployeePersonalInfo } from '../models/employee-detail';

@Injectable({
  providedIn: 'root',
})
export class EmployeeService {
  httpClient = inject(HttpClient);
  getAll() {
    return this.httpClient.get(`${ApiPaths.HRMS}/employees `);
  }
  getById(id: string) {
    return this.httpClient.get(`${ApiPaths.HRMS}/employees/getById/${id}`);
  }
  create(personalInfo: any) {
    return this.httpClient.post(`${ApiPaths.HRMS}/employees`, personalInfo);
  }
  updatePersonalInfo(employeeId: string, personalInfo: IEmployeePersonalInfo) {
    return this.httpClient.put(
      `${ApiPaths.HRMS}/employees/update/personal/` + employeeId,
      personalInfo,
    );
  }
  updateDocuments(docs: any) {
    return this.httpClient.put(`${ApiPaths.HRMS}/employees/update-document`, docs);
  }
  getEmployeesBySearchText(searchText: any) {
    return this.httpClient.post(`${ApiPaths.HRMS}/employees/search-by-text`, searchText);
  }
}
