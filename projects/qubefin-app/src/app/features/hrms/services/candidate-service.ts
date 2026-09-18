import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { ICandidateLetterStatusRequest } from '../models/candidate';

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
  // Send exactly one non-null flag per call - the backend finds the candidate,
  // fires the (currently stubbed) letter email, and updates that one flag.
  updateLetterStatus(id: string, request: ICandidateLetterStatusRequest) {
    return this.httpClient.post(`${ApiPaths.HRMS}/candidates/${id}/letter-status`, request);
  }
}
