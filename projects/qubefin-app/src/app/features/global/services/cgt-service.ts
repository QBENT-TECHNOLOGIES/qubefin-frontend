import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { ICgtRequest } from '../models/cgt';

@Service()
export class CgtService {
  private readonly httpClient = inject(HttpClient);

  // Saves the CGT as In Progress, or completes it when request.complete is true.
  save(surveyId: string, request: ICgtRequest) {
    return this.httpClient.put(`${ApiPaths.GLOBAL}/surveys/${surveyId}/cgt`, request);
  }
}
