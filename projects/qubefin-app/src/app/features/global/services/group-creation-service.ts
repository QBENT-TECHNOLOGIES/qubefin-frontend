import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { ICreateGroupFromSurveyRequest } from '../models/group-creation';

@Service()
export class GroupCreationService {
  private readonly httpClient = inject(HttpClient);

  // The Credit Officer creates the group of a survey after a GRT Pass.
  create(surveyId: string, request: ICreateGroupFromSurveyRequest) {
    return this.httpClient.post(`${ApiPaths.GLOBAL}/surveys/${surveyId}/group-create`, request);
  }
}
