import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { IMobilization } from '../models/mobilization';

@Injectable({
  providedIn: 'root',
})
export class MobilizationStore {
  private readonly surveyId = signal<string | undefined>(undefined);

  readonly mobilizationResource = httpResource<IMobilization>(() => {
    const id = this.surveyId();

    return id && id !== EMPTY_UUID ? `${ApiPaths.GLOBAL}/surveys/${id}/mobilization` : undefined;
  });

  readonly mobilization = computed(() => this.mobilizationResource.value());

  setSurveyId(id: string | undefined) {
    if (this.surveyId() !== id) {
      this.surveyId.set(id);
    }
  }

  refresh() {
    this.mobilizationResource.reload();
  }
}
