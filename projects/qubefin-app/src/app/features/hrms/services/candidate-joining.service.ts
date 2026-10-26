import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { ICandidateJoiningInfo } from '../models/candidate';

// Candidate side of the joining information: which employee was created from the candidate (with the
// candidate details the steps prefill), and the Personal step that creates it. Every later step uses
// EmployeeService with that employee's id.
@Injectable({
  providedIn: 'root',
})
export class CandidateJoiningService {
  httpClient = inject(HttpClient);
  getJoiningInfo(candidateId: string) {
    return this.httpClient.get<ICandidateJoiningInfo>(
      `${ApiPaths.HRMS}/candidates/${candidateId}/joining`,
    );
  }
  getPresonalData(candidateId: string) {
    return this.httpClient.get(`${ApiPaths.HRMS}/candidates/${candidateId}/joining/personal`);
  }
  // Multipart: personal fields plus the passport size photo and signature. Creates and links the employee
  // on the first save, updates it afterwards.
  savePersonalInfo(candidateId: string, personalInfo: FormData) {
    return this.httpClient.post(
      `${ApiPaths.HRMS}/candidates/${candidateId}/joining/personal`,
      personalInfo,
    );
  }
}
