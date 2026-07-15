import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { SurveyCommitteeItem } from '../models/survey-committee-item';

@Injectable({
  providedIn: 'root',
})
export class SurveyCommitteeService {
  private readonly httpClient = inject(HttpClient);
  private readonly basePath = `${ApiPaths.GLOBAL}/survey-committees`;

  create(surveyCommittee: SurveyCommitteeItem) {
    return this.httpClient.post(this.basePath, surveyCommittee);
  }

  update(id: string, surveyCommittee: SurveyCommitteeItem) {
    return this.httpClient.put(`${this.basePath}/${id}`, surveyCommittee);
  }

  getEmployeesBySearchText(searchText: any) {
    return this.httpClient.post(`${this.basePath}`, searchText);
  }
}
