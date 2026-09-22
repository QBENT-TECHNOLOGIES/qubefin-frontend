import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { ICandidateJoiningLetterStatus, ICandidateLetterStatusRequest } from '../models/candidate';

@Injectable({
  providedIn: 'root',
})
export class CandidateService {
  httpClient = inject(HttpClient);
  createCandidate(candidate: any) {
    return this.httpClient.post(`${ApiPaths.HRMS}/candidates`, candidate);
  }
  updateCandidate(id: any, candidate: any) {
    return this.httpClient.put(`${ApiPaths.HRMS}/candidates/${id}`, candidate);
  }
  // Send exactly one non-null flag per call. This only records that the flag changed - it does not
  // send any email (see sendLetterToCandidate for that).
  updateLetterStatus(id: string, request: ICandidateLetterStatusRequest) {
    return this.httpClient.post(`${ApiPaths.HRMS}/candidates/${id}/letter-status`, request);
  }
  // Send exactly one non-null flag per call, identifying which letter to email - actually sends the
  // letter email to the candidate via SMTP. Multipart: the rendered letter PDF travels with the request
  // as `File` and is what gets attached to the mail, so the caller fetches the report first.
  sendLetterToCandidate(id: string, request: ICandidateLetterStatusRequest, file: File) {
    const formData = new FormData();
    formData.append('file', file, file.name);

    // Only the one flag that was set is appended - the API resolves which letter to send from it.
    Object.entries(request).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    return this.httpClient.post(`${ApiPaths.HRMS}/candidates/${id}/send-letter`, formData);
  }
  // Uploads the candidate's filled written-interview/personality form (multipart) and stores the
  // returned file reference on the candidate record.
  uploadInterviewFormat(id: string, file: File) {
    const formData = new FormData();
    formData.append('Attachment', file, file.name);
    return this.httpClient.post(`${ApiPaths.HRMS}/candidates/${id}/interview-upload`, formData);
  }
  // Sets whether the candidate's interview was conducted Online or Offline.
  updateInterviewMode(id: string, interviewMode: 'Online' | 'Offline') {
    return this.httpClient.post(`${ApiPaths.HRMS}/candidates/${id}/interview-mode`, {
      interviewMode,
    });
  }
  // Placeholder action shown once the Offer Letter is received - the backend method is intentionally
  // empty for now.
  addAdditionalInfo(id: string) {
    return this.httpClient.post(`${ApiPaths.HRMS}/candidates/${id}/additional-info`, {});
  }
  // Uploads the candidate's signed/returned joining letter (multipart) and stores the returned file
  // reference on the candidate record. Distinct from HrmsReportService.getJoiningLetter, which generates
  // a blank copy rather than reading back what was uploaded here.
  uploadJoiningLetter(id: string, file: File) {
    const formData = new FormData();
    formData.append('Attachment', file, file.name);
    return this.httpClient.post(
      `${ApiPaths.HRMS}/candidates/${id}/joining-letter-upload`,
      formData,
    );
  }
  // Whether the candidate's signed joining letter has been uploaded yet - drives showing the Welcome
  // Letter section.
  getJoiningLetterStatus(id: string) {
    return this.httpClient.get<ICandidateJoiningLetterStatus>(
      `${ApiPaths.HRMS}/candidates/${id}/joining-letter-status`,
    );
  }
}
