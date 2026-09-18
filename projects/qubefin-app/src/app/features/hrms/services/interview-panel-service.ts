import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';

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

  submitAssessment(assessmentData: any) {
    return this.httpClient.post(`${ApiPaths.HRMS}/interview-panels/assessment`, assessmentData);
  }

  deletePanel(panelId: string) {
    return this.httpClient.delete(`${ApiPaths.HRMS}/interview-panels/${panelId}`);
  }
}
