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

	create(workflowEvent: IApprovalWorkflow) {
		return this.httpClient.post<IApprovalWorkflow>(this.basePath, workflowEvent);
	}

	update(id: string, workflowEvent: IApprovalWorkflow) {
		return this.httpClient.put<IApprovalWorkflow>(`${this.basePath}/${id}`, workflowEvent);
	}
}
