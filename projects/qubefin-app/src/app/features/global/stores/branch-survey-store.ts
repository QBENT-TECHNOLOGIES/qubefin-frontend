import { computed, inject, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { BranchSurveyDetail, BranchSurveyRequest } from '../models/branch-survey-detail';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BranchSurveyStore {
  // ===========================
  // ApiBase Path
  // ===========================
  private readonly basePath = `${ApiPaths.GLOBAL}/surveys`;
  private readonly httpClient = inject(HttpClient);

  // ===========================
  // Detail State
  // ===========================
  private readonly surveyId = signal<string | undefined>(undefined);
  private readonly branchSurveyId = signal<string | undefined>(undefined);

  // ===========================
  // Detail Api Call And Response
  // ===========================
  private readonly _branchSurvey = signal<BranchSurveyDetail | undefined>(undefined);
  
  readonly branchSurvey = computed(() => {
    const item = this._branchSurvey();
    return item ? this.normalizeItem(item) : undefined;
  });

  private readonly _loading = signal<boolean>(false);
  readonly loading = this._loading.asReadonly();
  
  private readonly _error = signal<any>(null);
  readonly error = this._error.asReadonly();

  // ===========================
  // Detail Actions
  // ===========================
  setSurveyId(id: string | undefined) {
    if (this.surveyId() !== id) {
      this.surveyId.set(id);
    }
  }

  clearBranchSurvey() {
    this._branchSurvey.set(undefined);
  }

  async fetchBranchSurvey(id: string) {
    this._loading.set(true);
    this._error.set(null);
    try {
      const url = `${this.basePath}/branch/${id}`;
      const response = await lastValueFrom(this.httpClient.get<{ branchSurveyResponse: BranchSurveyDetail }>(url));
      this._branchSurvey.set(response.branchSurveyResponse);
    } catch (err) {
      this._error.set(err);
      this._branchSurvey.set(undefined);
    } finally {
      this._loading.set(false);
    }
  }

  refreshDetail() {
    const id = this.surveyId();
    if (id && id !== EMPTY_UUID) {
      this.fetchBranchSurvey(id);
    }
  }

  async CreateBranchSurveyStep(payload: BranchSurveyRequest) {
    // Call the API to save the branch survey step
    const url = `${this.basePath}/branch`;
    const response = await lastValueFrom(this.httpClient.post<any>(url, payload));
    
    if (response?.value?.id) {
      this.branchSurveyId.set(response.value.id);
    }
    
    this.refreshDetail();
    return response;
  }

  async UpdateBranchSurveyStep(payload: BranchSurveyRequest) {
    // Call the API to save the branch survey step
    const url = `${this.basePath}/branch`;
    const response = await lastValueFrom(this.httpClient.put<any>(url, payload));
    
    if (response?.value?.id) {
      this.branchSurveyId.set(response.value.id);
    }
    
    this.refreshDetail();
    return response;
  }

  async SubmitBranchSurvey(payload: { id: string }) {
    const url = `${this.basePath}/branch/submit`;
    const response = await lastValueFrom(this.httpClient.post<any>(url, payload));
    this.refreshDetail();
    return response;
  }

  getBranchSurveyId(){
    return this.branchSurveyId();
  }

  private normalizeItem(item: BranchSurveyDetail): BranchSurveyDetail {
    return {
      ...item,
      surveyDate: item.surveyDate ? new Date(item.surveyDate) : new Date(),
    };
  }
}

