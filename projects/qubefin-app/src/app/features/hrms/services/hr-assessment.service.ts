import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { IHrAssessmentDecisionDto, IHrAssessmentFormDto } from '../models/hr-assessment';

@Injectable({
  providedIn: 'root',
})
export class HrAssessmentService {
  private httpClient = inject(HttpClient);

  /** Opens the HR Assessment form for a candidate - averages of the submitted panelists' ratings
   * (read-only) plus whatever HR has already saved as a draft/submission for this candidate, if any. */
  getAssessmentForm(candidateId: string) {
    return this.httpClient.get<IHrAssessmentFormDto>(`${ApiPaths.HRMS}/hr-assessment/${candidateId}`);
  }

  /** Saves HR's in-progress assessment as a draft. Does not finalize the candidate's recommendation. */
  saveDraft(candidateId: string, decision: IHrAssessmentDecisionDto) {
    return this.httpClient.post(`${ApiPaths.HRMS}/hr-assessment/${candidateId}/draft`, decision);
  }

  /** Submits (finalizes) the HR Assessment - requires every panelist to have submitted first. */
  submit(candidateId: string, decision: IHrAssessmentDecisionDto) {
    return this.httpClient.post(`${ApiPaths.HRMS}/hr-assessment/${candidateId}/submit`, decision);
  }
}
