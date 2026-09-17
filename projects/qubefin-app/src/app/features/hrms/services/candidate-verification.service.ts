import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';

export interface IVerificationModel {
  id?: string;
  candidateId: string;
  aadhaarStatus: 'Pending' | 'In Progress' | 'Verified' | 'Failed';
  panStatus: 'Pending' | 'In Progress' | 'Verified' | 'Failed';
  voterIdStatus: 'Pending' | 'In Progress' | 'Verified' | 'Failed';
  mobileStatus: 'Pending' | 'In Progress' | 'Verified' | 'Failed';
  uanStatus: 'Pending' | 'In Progress' | 'Verified' | 'Failed';
  hrBureauStatus: 'Pending' | 'In Progress' | 'Verified' | 'Failed';
  creditBureauStatus: 'Pending' | 'In Progress' | 'Verified' | 'Failed';
  overallStatus: 'Pending' | 'In Progress' | 'Verified' | 'Failed';
}

@Injectable({
  providedIn: 'root',
})
export class CandidateVerificationService {
  private httpClient = inject(HttpClient);

  getVerificationStatus(candidateId: string) {
    // Pending backend integration
    return this.httpClient.get<IVerificationModel>(`${ApiPaths.HRMS}/candidate-verifications/${candidateId}`);
  }

  updateVerification(candidateId: string, payload: Partial<IVerificationModel>) {
    // Pending backend integration
    return this.httpClient.put(`${ApiPaths.HRMS}/candidate-verifications/${candidateId}`, payload);
  }

  verifyDocument(candidateId: string, documentType: string, documentData: any) {
    // Pending backend integration
    return this.httpClient.post(`${ApiPaths.HRMS}/candidate-verifications/${candidateId}/verify/${documentType}`, documentData);
  }
}
