import { Payroll } from './../models/payroll-model';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';

@Injectable({
    providedIn: 'root',
})
export class PayrollService {
  httpClient = inject(HttpClient);
  getAll(){
    return this.httpClient.get(`${ApiPaths.PAYROLL}/payrolls`);
  }
  getById(id: string){
    return this.httpClient.get(`${ApiPaths.PAYROLL}/payroll/${id}`);
  }
  add(payroll: Payroll){
    return this.httpClient.post(`${ApiPaths.PAYROLL}/payroll`, payroll);
  }
  update(id: string, payroll: Payroll){
    return this.httpClient.put(`${ApiPaths.PAYROLL}/payroll/${id}`, payroll);
  }
}
