import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { IGroupRecommendationRequest } from '../models/group-review';
import { IEvaluationRequest } from '../models/survey-evaluation';

@Service()
export class GroupReviewService {
  private readonly httpClient = inject(HttpClient);

  // The Head of Branch recommends the survey or sends it back.
  recommend(surveyId: string, request: IGroupRecommendationRequest) {
    return this.httpClient.post(`${ApiPaths.GLOBAL}/surveys/${surveyId}/group-recommendation`, request);
  }

  // The Area Manager approves, rejects or sends the survey back.
  decide(surveyId: string, request: IEvaluationRequest) {
    return this.httpClient.post(`${ApiPaths.GLOBAL}/surveys/${surveyId}/group-approval`, request);
  }
}
