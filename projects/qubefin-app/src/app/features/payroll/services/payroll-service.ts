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
  getMontlyPayrolls(month: number, year: number){
    return this.httpClient.get(`${ApiPaths.PAYROLL}/payrolls/${month}/${year}`);
  }
}
