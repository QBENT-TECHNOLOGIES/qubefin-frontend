import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { IGroupReview } from '../models/group-review';

@Injectable({
  providedIn: 'root',
})
export class GroupReviewStore {
  private readonly surveyId = signal<string | undefined>(undefined);

  readonly reviewResource = httpResource<IGroupReview>(() => {
    const id = this.surveyId();

    return id && id !== EMPTY_UUID ? `${ApiPaths.GLOBAL}/surveys/${id}/group-review` : undefined;
  });

  readonly review = computed(() => this.reviewResource.value());

  setSurveyId(id: string | undefined) {
    if (this.surveyId() !== id) {
      this.surveyId.set(id);
    }
  }

  refresh() {
    this.reviewResource.reload();
  }
}
