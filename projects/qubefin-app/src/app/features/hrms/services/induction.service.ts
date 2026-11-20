import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';

export interface IInductionModel {
  candidateId: string;
  inductionStartDate: string;
  inductionStatus: 'Pending' | 'Completed';
  
  welcomeChecklist: {
    welcomeToOrg: boolean;
    introduceStaff: boolean;
    confidentiality: boolean;
    equipmentUsage: boolean;
  };
  roleChecklist: {
    workDuties: boolean;
    performanceProcess: boolean;
    orgStructure: boolean;
  };
  workHoursChecklist: {
    hoursAndBreaks: boolean;
    leaveProcedures: boolean;
    travelRequirements: boolean;
  };
  securityChecklist: {
    identityCard: boolean;
    passwords: boolean;
    firstAid: boolean;
    workplaceSafety: boolean;
  };
  policiesChecklist: {
    termsAndConditions: boolean;
    attendance: boolean;
    disciplinary: boolean;
    codeOfConduct: boolean;
  };
  exposureChecklist: {
    fieldVisit: boolean;
    branchActivities: boolean;
    clientInteraction: boolean;
  };
  
  feedback: {
    informative: string;
    wellOrganized: string;
    comfortable: string;
    rulesExplained: string;
    overallSatisfied: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class InductionService {
  private httpClient = inject(HttpClient);

  getInductionData(candidateId: string) {
    // Pending backend integration
    return this.httpClient.get<IInductionModel>(`${ApiPaths.HRMS}/inductions/${candidateId}`);
  }

  submitInduction(candidateId: string, payload: IInductionModel) {
    // Pending backend integration
    return this.httpClient.post(`${ApiPaths.HRMS}/inductions/${candidateId}`, payload);
  }
}
