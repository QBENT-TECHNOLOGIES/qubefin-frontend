import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { ISurveyEvaluations } from '../models/survey-evaluation';

@Injectable({
  providedIn: 'root',
})
export class SurveyEvaluationStore {
  private readonly surveyId = signal<string | undefined>(undefined);

  readonly evaluationResource = httpResource<ISurveyEvaluations>(() => {
    const id = this.surveyId();

    return id && id !== EMPTY_UUID ? `${ApiPaths.GLOBAL}/surveys/${id}/evaluations` : undefined;
  });

  readonly evaluations = computed(() => this.evaluationResource.value());
  readonly loading = computed(() => this.evaluationResource.isLoading());

  setSurveyId(id: string | undefined) {
    if (this.surveyId() !== id) {
      this.surveyId.set(id);
    }
  }

  refresh() {
    this.evaluationResource.reload();
  }
}
