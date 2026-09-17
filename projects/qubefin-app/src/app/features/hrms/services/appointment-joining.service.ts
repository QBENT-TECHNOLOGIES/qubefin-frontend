import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';

export interface IAppointmentJoiningModel {
  candidateId: string;
  referenceNumber: string;
  designation: string;
  department: string;
  branch: string;
  joiningDate: string;
  reportingTime: string;
  probationMonths: number;
  
  appointmentStatus: 'Pending' | 'Generated' | 'Sent' | 'Accepted';
  joiningStatus: 'Pending' | 'Completed';
  
  hrChecklist: {
    appointmentLetterVerified: boolean;
    originalDocumentsVerified: boolean;
    hrFormalitiesCompleted: boolean;
    payrollActivated: boolean;
    employeeIdCreated: boolean;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AppointmentJoiningService {
  private httpClient = inject(HttpClient);

  getAppointmentData(candidateId: string) {
    // Pending backend integration
    return this.httpClient.get<IAppointmentJoiningModel>(`${ApiPaths.HRMS}/appointments/${candidateId}`);
  }

  generateAppointment(payload: IAppointmentJoiningModel) {
    // Pending backend integration
    return this.httpClient.post(`${ApiPaths.HRMS}/appointments`, payload);
  }

  sendAppointment(candidateId: string) {
    // Pending backend integration
    return this.httpClient.post(`${ApiPaths.HRMS}/appointments/${candidateId}/send`, null);
  }

  submitJoiningReport(candidateId: string, hrChecklist: any) {
    // Pending backend integration
    return this.httpClient.post(`${ApiPaths.HRMS}/appointments/${candidateId}/joining`, hrChecklist);
  }
}
