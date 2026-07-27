import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiPaths } from 'qubefin-core';

@Injectable({
  providedIn: 'root'
})
export class LeaveRequestService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${ApiPaths.HRMS}/leave-requests`;

  create(formData: FormData): Observable<any> {
    return this.http.post(this.baseUrl, formData);
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  // sub(id: string, formData: FormData): Observable<any> {
  //   return this.http.put(`${this.baseUrl}/${id}`, formData);
  // }
}
