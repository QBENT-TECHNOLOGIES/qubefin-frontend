import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';

@Injectable({
  providedIn: 'root',
})
export class AttendanceService {
  httpClient = inject(HttpClient);
  applyRegularization(data: any) {
    return this.httpClient.post(`${ApiPaths.HRMS}/attendances/regularizations`, data);
  }
  submitRegularization(data: any) {
    return this.httpClient.post(`${ApiPaths.HRMS}/attendances/regularizations/submit`, data);
  }
}
