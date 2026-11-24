import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { IGroupSurveyResponse } from '../models/group-survey';

@Injectable({
  providedIn: 'root',
})
export class GroupSurveyStore {
  private readonly surveyId = signal<string | undefined>(undefined);

  readonly groupSurveyResource = httpResource<IGroupSurveyResponse>(() => {
    const id = this.surveyId();

    return id && id !== EMPTY_UUID ? `${ApiPaths.GLOBAL}/surveys/${id}/group-form` : undefined;
  });

  readonly groupSurvey = computed(() => this.groupSurveyResource.value());
  readonly canEditForm = computed(() => this.groupSurvey()?.canEditForm ?? false);
  readonly loading = computed(() => this.groupSurveyResource.isLoading());

  setSurveyId(id: string | undefined) {
    if (this.surveyId() !== id) {
      this.surveyId.set(id);
    }
  }

  refresh() {
    this.groupSurveyResource.reload();
  }
}
