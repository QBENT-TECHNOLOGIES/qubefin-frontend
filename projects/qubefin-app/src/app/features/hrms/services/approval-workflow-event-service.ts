import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { IApprovalWorkflowEvent } from '../models/approval-workflow-event';

@Injectable({
  providedIn: 'root',
})
export class ApprovalWorkflowEventService {
  private readonly httpClient = inject(HttpClient);
  private readonly basePath = `${ApiPaths.HRMS}/approval-workflow-events`;

  getAll() {
    return this.httpClient.get<IApprovalWorkflowEvent[]>(this.basePath);
  }

  getById(id: string) {
    return this.httpClient.get<IApprovalWorkflowEvent>(`${this.basePath}/${id}`);
  }

  create(workflowEvent: IApprovalWorkflowEvent) {
    return this.httpClient.post<IApprovalWorkflowEvent>(this.basePath, workflowEvent);
  }

  update(id: string, workflowEvent: IApprovalWorkflowEvent) {
    return this.httpClient.put<IApprovalWorkflowEvent>(`${this.basePath}/${id}`, workflowEvent);
  }
}
