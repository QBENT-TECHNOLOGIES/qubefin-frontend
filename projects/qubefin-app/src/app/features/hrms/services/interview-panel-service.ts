import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import {
  IAssessmentRequest,
  IInterviewAssessmentDto,
  IPanelistScheduleDto,
} from '../models/interview-panel';

@Injectable({
  providedIn: 'root',
})
export class InterviewPanelService {
  httpClient = inject(HttpClient);

  getPanelsByCandidate(candidateId: string) {
    return this.httpClient.get(`${ApiPaths.HRMS}/interview-panels/candidate/${candidateId}`);
  }

  getMyInterviews() {
    return this.httpClient.get<any[]>(`${ApiPaths.HRMS}/interview-panels/my-interviews`);
  }

  searchCandidates(searchText: string = '', maxResults: number = 50) {
    return this.httpClient.get<any>(
      `${ApiPaths.HRMS}/candidates/search?searchText=${searchText}&maxResults=${maxResults}`,
    );
  }

  schedulePanel(scheduleData: any) {
    return this.httpClient.post(`${ApiPaths.HRMS}/interview-panels/schedule`, scheduleData);
  }

  acknowledgePanel(candidateId: string) {
    return this.httpClient.post(
      `${ApiPaths.HRMS}/interview-panels/${candidateId}/acknowledge`,
      null,
    );
  }

  markAttendance(panelId: string, attended: boolean) {
    return this.httpClient.post(
      `${ApiPaths.HRMS}/interview-panels/${panelId}/attendance`,
      attended,
    );
  }

  submitAssessment(assessmentData: IAssessmentRequest) {
    return this.httpClient.post(`${ApiPaths.HRMS}/interview-panels/assessment`, assessmentData);
  }

  /** Saves an in-progress assessment without locking it. Marks the panelist as attended. */
  saveAssessmentDraft(assessmentData: IAssessmentRequest) {
    return this.httpClient.post(
      `${ApiPaths.HRMS}/interview-panels/assessment/draft`,
      assessmentData,
    );
  }

  /** Full assessment (ratings, remarks, attendance/submission status) for one panelist against a candidate. */
  getAssessmentByCandidateAndEmployee(candidateId: string, employeeId: string) {
    return this.httpClient.get<IInterviewAssessmentDto>(
      `${ApiPaths.HRMS}/interview-panels/assessment/${candidateId}/${employeeId}`,
    );
  }

  /** Adds one or more panelists to a candidate's existing interview panel. */
  addPanelists(candidateId: string, panelists: IPanelistScheduleDto[]) {
    return this.httpClient.post(
      `${ApiPaths.HRMS}/interview-panels/${candidateId}/panelists`,
      panelists,
    );
  }

  /** Removes an existing panelist from a candidate's interview panel. */
  removePanelist(candidateId: string, employeeId: string) {
    return this.httpClient.delete(
      `${ApiPaths.HRMS}/interview-panels/${candidateId}/panelists/${employeeId}`,
    );
  }
}
