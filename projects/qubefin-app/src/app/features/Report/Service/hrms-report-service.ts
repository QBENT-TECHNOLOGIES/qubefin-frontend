import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';

@Injectable({
  providedIn: 'root',
})
export class HrmsReportService {
  httpClient = inject(HttpClient);

  getInterviewLetter(candidateId: string) {
    return this.httpClient.get(
      `${ApiPaths.REPORT}/interview/interview-letter/${candidateId}`,
      {
        responseType: 'blob',
      },
    );
  }

  getInterviewPanelAcknowledgement(candidateId: string) {
    return this.httpClient.get(
      `${ApiPaths.REPORT}/interview/interviewpanel-acknowledgement/${candidateId}`,
      {
        responseType: 'blob',
      },
    );
  }

  getOfferLetter(candidateId: string) {
    return this.httpClient.get(`${ApiPaths.REPORT}/interview/offer-letter/${candidateId}`, {
      responseType: 'blob',
    });
  }

  getAppointmentLetter(candidateId: string) {
    return this.httpClient.get(
      `${ApiPaths.REPORT}/interview/appointment-letter/${candidateId}`,
      {
        responseType: 'blob',
      },
    );
  }

  getJoiningLetter(candidateId: string) {
    return this.httpClient.get(`${ApiPaths.REPORT}/interview/joining-letter/${candidateId}`, {
      responseType: 'blob',
    });
  }

  getWelcomeLetter(candidateId: string) {
    return this.httpClient.get(`${ApiPaths.REPORT}/interview/welcome-letter/${candidateId}`, {
      responseType: 'blob',
    });
  }

  getPersonalityForm(candidateId: string) {
    return this.httpClient.get(`${ApiPaths.REPORT}/interview/personality-form/${candidateId}`, {
      responseType: 'blob',
    });
  }

  getJobApplication(candidateId: string) {
    return this.httpClient.get(
      `${ApiPaths.REPORT}/interview/jobapplication-form/${candidateId}`,
      {
        responseType: 'blob',
      },
    );
  }
}
