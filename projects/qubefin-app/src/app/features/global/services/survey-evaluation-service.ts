import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { IEvaluationRequest } from '../models/survey-evaluation';

@Service()
export class SurveyEvaluationService {
  private readonly httpClient = inject(HttpClient);

  // A committee member saves (or changes) his evaluation.
  saveMemberEvaluation(surveyId: string, request: IEvaluationRequest) {
    return this.httpClient.put(`${ApiPaths.GLOBAL}/surveys/${surveyId}/evaluations`, request);
  }

  // The Committee Lead gives the final decision.
  saveFinalEvaluation(surveyId: string, request: IEvaluationRequest) {
    return this.httpClient.post(`${ApiPaths.GLOBAL}/surveys/${surveyId}/evaluations/final`, request);
  }
}
