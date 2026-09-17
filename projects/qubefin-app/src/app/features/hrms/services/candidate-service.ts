import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';

@Injectable({
  providedIn: 'root',
})
export class CandidateService {
  httpClient = inject(HttpClient);
  createCandidate(candidate: any) {
    return this.httpClient.post(`${ApiPaths.HRMS}/candidates`, candidate);
  }
  updateCandidate(id: any, candidate: any) {
    return this.httpClient.put(`${ApiPaths.HRMS}/candidates/${id}`, candidate);
  }
}
