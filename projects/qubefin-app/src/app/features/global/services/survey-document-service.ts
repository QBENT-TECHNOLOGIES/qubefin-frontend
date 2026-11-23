import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { ApiPaths } from 'qubefin-core';

@Service()
export class SurveyDocumentService {
  private readonly httpClient = inject(HttpClient);
  private readonly basePath = `${ApiPaths.GLOBAL}/surveys`;

  upload(surveyId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.httpClient.post(`${this.basePath}/${surveyId}/documents`, formData);
  }

  remove(surveyId: string, documentId: string) {
    return this.httpClient.delete(`${this.basePath}/${surveyId}/documents/${documentId}`);
  }
}
