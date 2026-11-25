import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { IGroupCreateInfo } from '../models/group-creation';

@Injectable({
  providedIn: 'root',
})
export class GroupCreationStore {
  private readonly surveyId = signal<string | undefined>(undefined);

  readonly infoResource = httpResource<IGroupCreateInfo>(() => {
    const id = this.surveyId();

    return id && id !== EMPTY_UUID ? `${ApiPaths.GLOBAL}/surveys/${id}/group-create-info` : undefined;
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
