import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { IGrt } from '../models/grt';

@Injectable({
  providedIn: 'root',
})
export class GrtStore {
  private readonly surveyId = signal<string | undefined>(undefined);

  readonly grtResource = httpResource<IGrt>(() => {
    const id = this.surveyId();

    return id && id !== EMPTY_UUID ? `${ApiPaths.GLOBAL}/surveys/${id}/grt` : undefined;
  });

  readonly grt = computed(() => this.grtResource.value());

  setSurveyId(id: string | undefined) {
    if (this.surveyId() !== id) {
      this.surveyId.set(id);
    }
  }

  refresh() {
    this.grtResource.reload();
  }
}
