import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { IEvaluationRequest } from '../models/survey-evaluation';

@Service()
export class SurveyApprovalService {
  private readonly httpClient = inject(HttpClient);

  // The Managing Director approves, rejects or sends the survey back for a recheck.
  saveDecision(surveyId: string, request: IEvaluationRequest) {
    return this.httpClient.post(`${ApiPaths.GLOBAL}/surveys/${surveyId}/approval`, request);
  }
}
