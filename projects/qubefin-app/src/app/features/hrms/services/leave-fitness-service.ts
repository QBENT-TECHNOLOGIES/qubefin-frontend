import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiPaths } from 'qubefin-core';

@Injectable({
  providedIn: 'root',
})
export class LeaveFitnessService {
  private readonly http = inject(HttpClient);

  fitnessAction(leaveRequestId: string): Observable<any> {
    return this.http.get(`${ApiPaths.HRMS}/leaves/fitnes-upload/action/${leaveRequestId}`);
  }
}
