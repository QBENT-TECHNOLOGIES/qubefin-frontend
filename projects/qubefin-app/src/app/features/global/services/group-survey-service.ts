import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { ApiPaths } from 'qubefin-core';

@Service()
export class GroupSurveyService {
  private readonly httpClient = inject(HttpClient);

  // Saves the whole form as a draft. Only the Lead Credit Officer is allowed to do this.
  saveDraft(surveyId: string, form: unknown) {
    return this.httpClient.put(`${ApiPaths.GLOBAL}/surveys/${surveyId}/group-form`, form);
  }

  // Sends the survey to the Head of the branch. Only the Lead Credit Officer is allowed to do this.
  submit(surveyId: string) {
    return this.httpClient.post(`${ApiPaths.GLOBAL}/surveys/${surveyId}/group-submit`, {});
  }
}
