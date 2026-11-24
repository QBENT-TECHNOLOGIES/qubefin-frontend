import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { IGroupDecisionRequest, IGroupRequest } from '../models/group';

@Service()
export class GroupService {
  private readonly httpClient = inject(HttpClient);
  private readonly basePath = `${ApiPaths.GLOBAL}/groups`;

  create(request: IGroupRequest) {
    return this.httpClient.post(this.basePath, request);
  }

  update(id: string, request: IGroupRequest) {
    return this.httpClient.put(`${this.basePath}/${id}`, request);
  }

  // The Head of the branch or the Area Manager approves or rejects a Pending group.
  decide(id: string, request: IGroupDecisionRequest) {
    return this.httpClient.post(`${this.basePath}/${id}/decision`, request);
  }
}
