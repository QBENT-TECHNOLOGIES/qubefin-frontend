import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { ISurveyCommitteeItem } from '../models/survey-committee-item';

@Injectable({
  providedIn: 'root',
})
export class SurveyCommitteeService {
  private readonly httpClient = inject(HttpClient);
  private readonly basePath = `${ApiPaths.GLOBAL}/survey-committees`;

  create(surveyCommittee: ISurveyCommitteeItem) {
    return this.httpClient.post(this.basePath, surveyCommittee);
  }

  update(surveyCommittee: any) {
    return this.httpClient.put(`${this.basePath}`, surveyCommittee);
  }
}
