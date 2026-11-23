import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { IBranchSurveyResponse } from '../models/branch-survey';

@Injectable({
  providedIn: 'root',
})
export class BranchSurveyStore {
  private readonly surveyId = signal<string | undefined>(undefined);

  // ===========================
  // Form Api Call And Response
  // ===========================
  readonly branchSurveyResource = httpResource<IBranchSurveyResponse>(() => {
    const id = this.surveyId();

    return id && id !== EMPTY_UUID ? `${ApiPaths.GLOBAL}/surveys/${id}/branch-form` : undefined;
  });

  readonly branchSurvey = computed(() => this.branchSurveyResource.value());
  readonly canEditForm = computed(() => this.branchSurvey()?.canEditForm ?? false);

  // ===========================
  // Loading And Error
  // ===========================
  readonly loading = computed(() => this.branchSurveyResource.isLoading());
  readonly error = computed(() => this.branchSurveyResource.error());

  // ===========================
  // Actions
  // ===========================
  setSurveyId(id: string | undefined) {
    if (this.surveyId() !== id) {
      this.surveyId.set(id);
    }
  }

  refresh() {
    this.branchSurveyResource.reload();
  }
}
