import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';

// Mirrors backend `CandidateVerificationDto` (GET response). There is no external verification API
// supplied by the client - every flag here is set by hand by whoever (HR/Admin) performed the check.
// NOTE: this replaces the previous `IVerificationModel`, which used a 4-state string enum per field
// ('Pending' | 'In Progress' | 'Verified' | 'Failed'). The actual backend only ever stores a boolean
// per check, so that shape did not match what the API can return - any component still importing
// `IVerificationModel` from this file will need to be updated to this boolean-based shape.
export interface ICandidateVerification {
  candidateId: string;
  aadharNumber?: string;
  isAadharValidated: boolean;
  voterNumber?: string;
  isVoterValited: boolean;
  pan?: string;
  isPanValidated: boolean;
  mobileNo?: string;
  isMobileValidated: boolean;
  uan?: string;
  isUanVerified: boolean;
  isCreditBureauChecked: boolean;
  creditBureauReportLink?: string;
  overallStatus: string;
}

// Body for PUT candidate-verifications/{candidateId}. Mirrors backend `CandidateVerificationUpdateRequest`.
// All six flags are sent together in one call, unlike the one-flag-per-call letter-status endpoint.
export interface ICandidateVerificationUpdateRequest {
  isAadharValidated: boolean;
  isVoterValited: boolean;
  isPanValidated: boolean;
  isMobileValidated: boolean;
  isUanVerified: boolean;
  isCreditBureauChecked: boolean;
  creditBureauReportLink?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CandidateVerificationService {
  private httpClient = inject(HttpClient);

  getVerificationStatus(candidateId: string) {
    return this.httpClient.get<ICandidateVerification>(`${ApiPaths.HRMS}/candidate-verifications/${candidateId}`);
  }

  // There is no external verification API supplied by the client yet - this records the outcome of
  // checks HR/Admin performed manually. All six flags are sent together in one call.
  updateVerification(candidateId: string, request: ICandidateVerificationUpdateRequest) {
    return this.httpClient.put<ICandidateVerification>(`${ApiPaths.HRMS}/candidate-verifications/${candidateId}`, request);
  }

  // NOTE: removed `verifyDocument` - it called a `.../verify/{documentType}` route that does not exist
  // anywhere on the backend (no controller/endpoint for it), so it could never have worked. There is no
  // per-document verification endpoint today; per-check results are all set via `updateVerification`.
}
