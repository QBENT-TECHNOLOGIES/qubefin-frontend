import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { AssignOdFollowUpRequest, AssignOdFollowUpResponse } from '../models/overdue-customer';

@Injectable({ providedIn: 'root' })
export class OdFollowUpService {
  private readonly http = inject(HttpClient);

  assign(req: AssignOdFollowUpRequest) {
    return this.http.post<AssignOdFollowUpResponse>(
      `${ApiPaths.TRACKING}/overdue-customers/assign-follow-up`,
      req,
    );
  }
}
