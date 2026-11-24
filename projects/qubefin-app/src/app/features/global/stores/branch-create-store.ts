import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { IBranchCreateInfo } from '../models/branch-create';

@Injectable({
  providedIn: 'root',
})
export class BranchCreateStore {
  private readonly surveyId = signal<string | undefined>(undefined);

  readonly infoResource = httpResource<IBranchCreateInfo>(() => {
    const id = this.surveyId();

    return id && id !== EMPTY_UUID ? `${ApiPaths.GLOBAL}/surveys/${id}/branch-create` : undefined;
  });

  readonly info = computed(() => this.infoResource.value());

  setSurveyId(id: string | undefined) {
    if (this.surveyId() !== id) {
      this.surveyId.set(id);
    }
  }

  refresh() {
    this.infoResource.reload();
  }
}
