import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { IBorrowerDecisionRequest, IBorrowerRequest } from '../models/mobilization';

@Service()
export class MobilizationService {
  private readonly httpClient = inject(HttpClient);

  add(surveyId: string, request: IBorrowerRequest) {
    return this.httpClient.post(`${ApiPaths.GLOBAL}/surveys/${surveyId}/borrowers`, request);
  }

  update(surveyId: string, borrowerId: string, request: IBorrowerRequest) {
    return this.httpClient.put(`${ApiPaths.GLOBAL}/surveys/${surveyId}/borrowers/${borrowerId}`, request);
  }

  // The Head of the branch changes Add / Block of a flagged borrower.
  changeDecision(surveyId: string, borrowerId: string, request: IBorrowerDecisionRequest) {
    return this.httpClient.post(`${ApiPaths.GLOBAL}/surveys/${surveyId}/borrowers/${borrowerId}/decision`, request);
  }
}
