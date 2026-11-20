import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { IApprovalWorkflow } from '../models/approval-workflow';

@Injectable({
  providedIn: 'root',
})
export class ApprovalWorkflowService {
  private readonly httpClient = inject(HttpClient);
  private readonly basePath = `${ApiPaths.HRMS}/approval-workflows`;

  getAll() {
    return this.httpClient.get<IApprovalWorkflow[]>(this.basePath);
  }

  getById(id: string) {
    return this.httpClient.get<IApprovalWorkflow>(`${this.basePath}/${id}`);
  }

  create(workflowEvent: any) {
    return this.httpClient.post<any>(this.basePath, workflowEvent);
  }

  update(id: string, workflowEvent: any) {
    return this.httpClient.put<any>(`${this.basePath}/${id}`, workflowEvent);
  }
}
