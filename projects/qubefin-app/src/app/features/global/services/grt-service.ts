import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { IGrtRequest } from '../models/grt';

@Service()
export class GrtService {
  private readonly httpClient = inject(HttpClient);

  // Saves the GRT as In Progress, or submits it when request.submit is true.
  save(surveyId: string, request: IGrtRequest) {
    return this.httpClient.put(`${ApiPaths.GLOBAL}/surveys/${surveyId}/grt`, request);
  }
}
