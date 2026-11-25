import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { ICgt } from '../models/cgt';

@Injectable({
  providedIn: 'root',
})
export class CgtStore {
  private readonly surveyId = signal<string | undefined>(undefined);

  readonly cgtResource = httpResource<ICgt>(() => {
    const id = this.surveyId();

    return id && id !== EMPTY_UUID ? `${ApiPaths.GLOBAL}/surveys/${id}/cgt` : undefined;
  });

  readonly cgt = computed(() => this.cgtResource.value());

  setSurveyId(id: string | undefined) {
    if (this.surveyId() !== id) {
      this.surveyId.set(id);
    }
  }

  refresh() {
    this.cgtResource.reload();
  }
}
