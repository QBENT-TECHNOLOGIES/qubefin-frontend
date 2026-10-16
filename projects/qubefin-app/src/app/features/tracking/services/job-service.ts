import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import {
  AddTasksRequest,
  AddTasksResponse,
  AssignJobRequest,
  CreateJobRequest,
  ExtendJobRequest,
  Job,
  RemarksRequest,
  TransferJobRequest,
  TransferJobResponse,
} from '../models/job';

/** Writes for jobs and their tasks. Reads live in JobStore. */
@Injectable({ providedIn: 'root' })
export class JobService {
  private readonly http = inject(HttpClient);
  private readonly basePath = `${ApiPaths.TRACKING}/jobs`;

  create(req: CreateJobRequest) {
    return this.http.post<AddTasksResponse>(this.basePath, req);
  }

  assign(jobId: string, req: AssignJobRequest) {
    return this.http.put<Job>(`${this.basePath}/${jobId}/assign`, req);
  }

  transfer(jobId: string, req: TransferJobRequest) {
    return this.http.put<TransferJobResponse>(`${this.basePath}/${jobId}/transfer`, req);
  }

  addTasks(jobId: string, req: AddTasksRequest) {
    return this.http.post<AddTasksResponse>(`${this.basePath}/${jobId}/tasks`, req);
  }

  cancelTask(jobId: string, taskId: string, req: RemarksRequest) {
    return this.http.put<Job>(`${this.basePath}/${jobId}/tasks/${taskId}/cancel`, req);
  }

  /** Refuse a task the employee added from the mobile app. */
  rejectTask(jobId: string, taskId: string, req: RemarksRequest) {
    return this.http.put<Job>(`${this.basePath}/${jobId}/tasks/${taskId}/reject`, req);
  }

  extend(jobId: string, req: ExtendJobRequest) {
    return this.http.put<Job>(`${this.basePath}/${jobId}/extend`, req);
  }

  cancel(jobId: string, req: RemarksRequest) {
    return this.http.put<Job>(`${this.basePath}/${jobId}/cancel`, req);
  }
}
