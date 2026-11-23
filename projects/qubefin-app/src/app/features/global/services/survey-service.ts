import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { SurveyCreateDetail } from '../models/survey';

@Service()
export class SurveyService {
  private readonly httpClient = inject(HttpClient);
  private readonly basePath = `${ApiPaths.GLOBAL}/surveys`;

  create(SurveyUnitDetail: SurveyCreateDetail) {
    return this.httpClient.post(this.basePath, SurveyUnitDetail);
  }

  update(SurveyUnitDetail: SurveyCreateDetail) {
    return this.httpClient.put(`${this.basePath}`, SurveyUnitDetail);
  }

  addBranchSurvey(branchSurvey: any) {
    return this.httpClient.post(`${this.basePath}/branch`, branchSurvey);
  }

  upadateBranchSurvey(branchSurvey: any) {
    return this.httpClient.put(`${this.basePath}/branch`, branchSurvey);
  }
}
