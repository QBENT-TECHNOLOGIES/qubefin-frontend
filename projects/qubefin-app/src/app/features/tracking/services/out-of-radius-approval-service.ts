import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { ApprovalDecisionRequest, OutOfRadiusRequest } from '../models/approval-request';

@Injectable({ providedIn: 'root' })
export class OutOfRadiusApprovalService {
  private readonly http = inject(HttpClient);

  decide(requestId: string, req: ApprovalDecisionRequest) {
    return this.http.put<OutOfRadiusRequest>(`${ApiPaths.TRACKING}/approvals/${requestId}/decision`, req);
  }
}
