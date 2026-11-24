import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { ISurveyDetail } from '../models/survey';

@Service()
export class SurveyService {
  private readonly httpClient = inject(HttpClient);
  private readonly basePath = `${ApiPaths.GLOBAL}/surveys`;

  create(SurveyUnitDetail: ISurveyDetail) {
    return this.httpClient.post(this.basePath, SurveyUnitDetail);
  }

  update(SurveyUnitDetail: ISurveyDetail) {
    return this.httpClient.put(`${this.basePath}`, SurveyUnitDetail);
  }
}
