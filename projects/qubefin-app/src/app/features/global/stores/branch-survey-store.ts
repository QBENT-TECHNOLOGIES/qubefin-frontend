import { httpResource } from '@angular/common/http';
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

  // ===========================
  // Detail Api Call And Response
  // ===========================
  readonly branchSurveyResource = httpResource<BranchSurveyDetail>(() => {
    const id = this.surveyId();
    // Assuming backend returns BranchSurveyDetail at /surveys/branch-survey/{id} or similar
    // The user didn't specify the exact GET endpoint, assuming /surveys/{id}/branch-survey or similar.
    // Given the prompt "when i save first stap ...", let's assume standard GET.
    return id && id !== EMPTY_UUID ? `${this.basePath}/branch/${id}` : undefined;
  });

  // ===========================
  // Preparing Data
  // ===========================
  readonly branchSurvey = computed(() => {
    const item = this.branchSurveyResource.value();
    return item ? this.normalizeItem(item) : undefined;
  });

  // ===========================
  // Loading And Error of the Detail Api
  // ===========================
  readonly loading = computed(() => this.branchSurveyResource.isLoading());
  readonly error = computed(() => this.branchSurveyResource.error());

  // ===========================
  // Detail Actions
  // ===========================
  setSurveyId(id: string | undefined) {
    if (this.surveyId() !== id) {
      this.surveyId.set(id);
    }
  }

  refreshDetail() {
    this.branchSurveyResource.reload();
  }

  async saveBranchSurveyStep(payload: BranchSurveyRequest) {
    // Call the API to save the branch survey step
    const url = `${this.basePath}/branch`;
    const response = await lastValueFrom(this.httpClient.post(url, payload));
    this.refreshDetail();
    return response;
  }

  private normalizeItem(item: BranchSurveyDetail): BranchSurveyDetail {
    return {
      ...item,
      surveyDate: item.surveyDate ? new Date(item.surveyDate) : new Date(),
    };
  }
}

