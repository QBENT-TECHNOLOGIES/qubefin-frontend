import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { SurveyCommitteeItem } from '../models/survey-committee-item';

type SurveyCommitteeListResponse =
  | SurveyCommitteeItem[]
  | {
      surveyCommitteeUnits?: SurveyCommitteeItem[];
      surveyCommittees?: SurveyCommitteeItem[];
      items?: SurveyCommitteeItem[];
    };

type SurveyCommitteeDetailResponse =
  | SurveyCommitteeItem
  | {
      surveyCommitteeUnit?: SurveyCommitteeItem;
      surveyCommittee?: SurveyCommitteeItem;
      item?: SurveyCommitteeItem;
    };

@Injectable({
  providedIn: 'root',
})
export class SurveyCommitteeStore {
  private readonly surveyCommitteeId = signal<string | undefined>(undefined);
  private readonly basePath = `${ApiPaths.GLOBAL}/survey-committee-units`;

  readonly surveyCommitteeUnitsResource = httpResource<SurveyCommitteeListResponse>(
    () => this.basePath,
  );
  readonly surveyCommitteeUnits = computed(() => {
    const value = this.surveyCommitteeUnitsResource.value();

    if (!value) {
      return [];
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.normalizeItem(item));
    }

    return (value.surveyCommitteeUnits ?? value.surveyCommittees ?? value.items ?? []).map((item) =>
      this.normalizeItem(item),
    );
  });

  readonly loading = computed(() => this.surveyCommitteeUnitsResource.isLoading());
  readonly error = computed(() => this.surveyCommitteeUnitsResource.error());

  private readonly surveyCommitteeUnitResource = httpResource<SurveyCommitteeDetailResponse>(() => {
    const id = this.surveyCommitteeId();
    if (!id || id === EMPTY_UUID) {
      return undefined;
    }

    return `${this.basePath}/${id}`;
  });

  readonly surveyCommitteeUnit = computed(() => {
    const value = this.surveyCommitteeUnitResource.value();

    if (!value) {
      return undefined;
    }

    if ('id' in value) {
      return this.normalizeItem(value);
    }

    const item = value.surveyCommitteeUnit ?? value.surveyCommittee ?? value.item;
    return item ? this.normalizeItem(item) : undefined;
  });

  readonly surveyCommitteeUnitLoading = computed(() => this.surveyCommitteeUnitResource.isLoading());
  readonly surveyCommitteeUnitError = computed(() => this.surveyCommitteeUnitResource.error());

  setSurveyCommitteeId(id: string | undefined) {
    if (this.surveyCommitteeId() === id) {
      return;
    }

    this.surveyCommitteeId.set(id);
  }

  refreshList() {
    this.surveyCommitteeUnitsResource.reload();
  }

  refreshDetail() {
    this.surveyCommitteeUnitResource.reload();
  }

  private normalizeItem(item: SurveyCommitteeItem): SurveyCommitteeItem {
    return {
      ...item,
      assignedFrom: item.assignedFrom ? new Date(item.assignedFrom) : new Date(),
      assignedTo: item.assignedTo ? new Date(item.assignedTo) : new Date(),
    };
  }
}
