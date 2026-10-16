import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { AddOdToJobRequest, AddOdToJobResponse } from '../models/overdue-customer';

@Injectable({ providedIn: 'root' })
export class OdFollowUpService {
  private readonly http = inject(HttpClient);

  /** Adds the customers as OD follow-up tasks to an existing job, or to a new one. */
  addToJob(req: AddOdToJobRequest) {
    return this.http.post<AddOdToJobResponse>(`${ApiPaths.TRACKING}/overdue-customers/add-to-job`, req);
  }
}
