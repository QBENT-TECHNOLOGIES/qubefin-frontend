import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { ICreateBranchRequest } from '../models/branch-create';

@Service()
export class BranchCreateService {
  private readonly httpClient = inject(HttpClient);

  // The Committee Lead creates the branch from an approved Branch Survey.
  create(surveyId: string, request: ICreateBranchRequest) {
    return this.httpClient.post(`${ApiPaths.GLOBAL}/surveys/${surveyId}/branch-create`, request);
  }
}
