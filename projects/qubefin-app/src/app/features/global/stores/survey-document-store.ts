import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { ISurveyDocument } from '../models/survey-document';

@Injectable({
  providedIn: 'root',
})
export class SurveyDocumentStore {
  private readonly surveyId = signal<string | undefined>(undefined);

  // ===========================
  // Photograph list
  // ===========================
  readonly documentsResource = httpResource<ISurveyDocument[]>(() => {
    const id = this.surveyId();

    return id && id !== EMPTY_UUID ? `${ApiPaths.GLOBAL}/surveys/${id}/documents` : undefined;
  });

  readonly documents = computed(() => this.documentsResource.value() ?? []);
  readonly loading = computed(() => this.documentsResource.isLoading());

  // ===========================
  // Actions
  // ===========================
  setSurveyId(id: string | undefined) {
    if (this.surveyId() !== id) {
      this.surveyId.set(id);
    }
  }

  refresh() {
    this.documentsResource.reload();
  }
}
