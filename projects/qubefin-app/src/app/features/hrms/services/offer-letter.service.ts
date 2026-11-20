import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';

export interface IOfferLetterModel {
  candidateId: string;
  designation: string;
  placeOfPosting: string;
  dateOfJoining: string;
  reportingTime: string;
  monthlyCtc: number;
  referenceNumber: string;
  offerStatus: 'Generated' | 'Sent' | 'Accepted' | 'Rejected' | 'Pending';
  acceptanceDate?: string;
}

@Injectable({
  providedIn: 'root',
})
export class OfferLetterService {
  private httpClient = inject(HttpClient);

  getOfferLetter(candidateId: string) {
    // Pending backend integration
    return this.httpClient.get<IOfferLetterModel>(`${ApiPaths.HRMS}/offer-letters/${candidateId}`);
  }

  generateOfferLetter(payload: IOfferLetterModel) {
    // Pending backend integration
    return this.httpClient.post(`${ApiPaths.HRMS}/offer-letters`, payload);
  }

  sendOfferLetter(candidateId: string) {
    // Pending backend integration
    return this.httpClient.post(`${ApiPaths.HRMS}/offer-letters/${candidateId}/send`, null);
  }
}
