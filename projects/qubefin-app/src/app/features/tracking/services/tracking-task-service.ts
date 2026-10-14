import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import {
  BulkReassignRequest,
  CancelTaskRequest,
  CreateTaskRequest,
  ReassignTaskRequest,
  TrackingTask,
} from '../models/tracking-task';

@Injectable({ providedIn: 'root' })
export class TrackingTaskService {
  private readonly http = inject(HttpClient);
  private readonly basePath = `${ApiPaths.TRACKING}/tasks`;

  create(req: CreateTaskRequest) {
    return this.http.post<TrackingTask>(this.basePath, req);
  }

  reassign(taskId: string, req: ReassignTaskRequest) {
    return this.http.put<TrackingTask>(`${this.basePath}/${taskId}/reassign`, req);
  }

  bulkReassign(req: BulkReassignRequest) {
    return this.http.post<{ updated: number }>(`${this.basePath}/bulk-reassign`, req);
  }

  cancel(taskId: string, req: CancelTaskRequest) {
    return this.http.put<TrackingTask>(`${this.basePath}/${taskId}/cancel`, req);
  }
}
