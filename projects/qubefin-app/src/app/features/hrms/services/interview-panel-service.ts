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

  /** Schedules the panel; the API emails each panelist with the acknowledgement PDF attached. */
  schedulePanel(candidateId: string, panelists: IPanelistScheduleDto[], acknowledgement: Blob | null) {
    const formData = this.toPanelFormData(panelists, acknowledgement);
    formData.append('CandidateId', candidateId);
    return this.httpClient.post(`${ApiPaths.HRMS}/interview-panels/schedule`, formData);
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

  /** Adds one or more panelists to a candidate's existing interview panel and emails the new panelists. */
  addPanelists(candidateId: string, panelists: IPanelistScheduleDto[], acknowledgement: Blob | null) {
    return this.httpClient.post(
      `${ApiPaths.HRMS}/interview-panels/${candidateId}/panelists`,
      this.toPanelFormData(panelists, acknowledgement),
    );
  }

  private toPanelFormData(panelists: IPanelistScheduleDto[], acknowledgement: Blob | null) {
    const formData = new FormData();
    panelists.forEach((p, i) => {
      formData.append(`Panelists[${i}].EmployeeId`, p.employeeId);
      formData.append(`Panelists[${i}].ScheduledDate`, p.scheduledDate);
      formData.append(`Panelists[${i}].ScheduledTime`, p.scheduledTime);
    });
    if (acknowledgement) {
      formData.append('File', acknowledgement, 'interview_panel_acknowledgement.pdf');
    }
    return formData;
  }

  /** Removes an existing panelist from a candidate's interview panel. */
  removePanelist(candidateId: string, employeeId: string) {
    return this.httpClient.delete(
      `${ApiPaths.HRMS}/interview-panels/${candidateId}/panelists/${employeeId}`,
    );
  }
}
