import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { ApiPaths } from 'qubefin-core';

@Service()
export class BranchSurveyService {
  private readonly httpClient = inject(HttpClient);

  // Saves the whole form as a draft. Only the Lead Surveyor is allowed to do this.
  saveDraft(surveyId: string, form: unknown) {
    return this.httpClient.put(`${ApiPaths.GLOBAL}/surveys/${surveyId}/branch-form`, form);
  }

  // Sends the survey to the Survey Committee. Only the Lead Surveyor is allowed to do this.
  submit(surveyId: string) {
    return this.httpClient.post(`${ApiPaths.GLOBAL}/surveys/${surveyId}/submit`, {});
  }
}
