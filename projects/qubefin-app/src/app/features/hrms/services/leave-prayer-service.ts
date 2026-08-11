import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiPaths } from 'qubefin-core';

@Injectable({
  providedIn: 'root',
})
export class LeavePrayerService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${ApiPaths.HRMS}/leave/prayers`;
  save(formData: FormData): Observable<any> {
    return this.http.post(this.baseUrl, formData);
  }
}
