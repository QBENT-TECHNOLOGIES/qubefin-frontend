import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { ISurveyApproval } from '../models/survey-approval';

@Injectable({
  providedIn: 'root',
})
export class SurveyApprovalStore {
  private readonly surveyId = signal<string | undefined>(undefined);

  readonly approvalResource = httpResource<ISurveyApproval>(() => {
    const id = this.surveyId();

    return id && id !== EMPTY_UUID ? `${ApiPaths.GLOBAL}/surveys/${id}/approval` : undefined;
  });

  readonly approval = computed(() => this.approvalResource.value());

  setSurveyId(id: string | undefined) {
    if (this.surveyId() !== id) {
      this.surveyId.set(id);
    }
  }

  refresh() {
    this.approvalResource.reload();
  }
}
