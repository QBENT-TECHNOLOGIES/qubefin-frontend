import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { AddOdToJobRequest, AddOdToJobResponse } from '../models/od-member';

@Injectable({ providedIn: 'root' })
export class OdMemberService {
  private readonly http = inject(HttpClient);

  /** Adds the members as OD follow-up tasks to an existing job, or to a new one. */
  addToJob(req: AddOdToJobRequest) {
    return this.http.post<AddOdToJobResponse>(`${ApiPaths.TRACKING}/od-members/add-to-job`, req);
  }
}
