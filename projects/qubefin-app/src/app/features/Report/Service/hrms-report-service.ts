import { HttpClient } from '@angular/common/http';
import { inject, Injectable, Service } from '@angular/core';
import { ApiPaths } from 'qubefin-core';

@Injectable({
  providedIn: 'root',
})
export class HrmsReportService {
  httpClient = inject(HttpClient);
  getWegrowInterviewLetter(candidateId: string) {
    return this.httpClient.get(
      `${ApiPaths.REPORT}/interview/wegrow-interview-letter/${candidateId}`,
      {
        responseType: 'blob',
      },
    );
  }
  getWeegroBcInterviewLetter(candidateId: string) {
    return this.httpClient.get(
      `${ApiPaths.REPORT}/interview/weegrobc-interview-letter/${candidateId}`,
      {
        responseType: 'blob',
      },
    );
  }
  getWegrowInterviewPanelAcknowledgement(candidateId: string) {
    return this.httpClient.get(
      `${ApiPaths.REPORT}/interview/wegrow-interviewpanel-acknowledgement/${candidateId}`,
      {
        responseType: 'blob',
      },
    );
  }
  getWeegroBcInterviewPanelAcknowledgement(candidateId: string) {
    return this.httpClient.get(
      `${ApiPaths.REPORT}/interview/weegrobc-interviewpanel-acknowledgement/${candidateId}`,
      {
        responseType: 'blob',
      },
    );
  }
  getWegrowOfferLetter(candidateId: string) {
    return this.httpClient.get(`${ApiPaths.REPORT}/interview/wegrow-offer-letter/${candidateId}`, {
      responseType: 'blob',
    });
  }
  getWeegroBcOfferLetter(candidateId: string) {
    return this.httpClient.get(
      `${ApiPaths.REPORT}/interview/weegrobc-offer-letter/${candidateId}`,
      {
        responseType: 'blob',
      },
    );
  }
  getWegrowAppointmentLetter(candidateId: string) {
    return this.httpClient.get(
      `${ApiPaths.REPORT}/interview/wegrow-appointment-letter/${candidateId}`,
      {
        responseType: 'blob',
      },
    );
  }
  getWeegroBcAppointmentLetter(candidateId: string) {
    return this.httpClient.get(
      `${ApiPaths.REPORT}/interview/weegrobc-appointment-letter/${candidateId}`,
      {
        responseType: 'blob',
      },
    );
  }

  getWegrowJoiningLetter(candidateId: string) {
    return this.httpClient.get(
      `${ApiPaths.REPORT}/interview/wegrow-joining-letter/${candidateId}`,
      {
        responseType: 'blob',
      },
    );
  }
  getWeegroBcJoiningLetter(candidateId: string) {
    return this.httpClient.get(
      `${ApiPaths.REPORT}/interview/weegrobc-joining-letter/${candidateId}`,
      {
        responseType: 'blob',
      },
    );
  }
  getWegrowPersonalityForm(candidateId: string) {
    return this.httpClient.get(
      `${ApiPaths.REPORT}/interview/wegrow-personality-form/${candidateId}`,
      {
        responseType: 'blob',
      },
    );
  }
  getWeegroBcPersonalityForm(candidateId: string) {
    return this.httpClient.get(
      `${ApiPaths.REPORT}/interview/weegrobc-personality-form/${candidateId}`,
      {
        responseType: 'blob',
      },
    );
  }
}
