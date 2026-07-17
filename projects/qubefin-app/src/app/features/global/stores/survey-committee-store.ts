import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { ISurveyCommitteeItem } from '../models/survey-committee-item';

@Injectable({
  providedIn: 'root',
})
export class SurveyCommitteeStore {
  // ===========================
  // ApiBase Path
  // ===========================
  private readonly basePath = `${ApiPaths.GLOBAL}/survey-committees`;

  // ===========================
  // List State
  // ===========================
  private readonly surveyCommitteeId = signal<string | undefined>(undefined);

  // ===========================
  // List Resource
  // ===========================
  readonly searchQuery = signal('');
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly sortOn = signal('assignedFrom');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');

  // ===========================
  // List Api Call And Response
  // ===========================
  readonly surveyCommitteeUnitsResource = httpResource<{
    surveyCommittees: ISurveyCommitteeItem[];
    totalRecords: number;
  }>(() => {
    const search = encodeURIComponent(this.searchQuery());

    return `${this.basePath}/filter?searchText=${search}&sortOn=${this.sortOn()}&sortDirection=${this.sortDirection()}&pageIndex=${this.pageIndex()}&pageSize=${this.pageSize()}`;
  });

  // ===========================
  // Preparing Data
  // ===========================

  readonly surveyCommitteeUnits = computed(() =>
    (this.surveyCommitteeUnitsResource.value()?.surveyCommittees ?? []).map(this.normalizeItem),
  );

  readonly totalRecords = computed(
    () => this.surveyCommitteeUnitsResource.value()?.totalRecords ?? 0,
  );

  // ===========================
  // Loading And Error of the List Api
  // ===========================

  readonly loading = computed(() => this.surveyCommitteeUnitsResource.isLoading());
  readonly error = computed(() => this.surveyCommitteeUnitsResource.error());

  // ===========================
  // Detail Api Call And Response
  // ===========================

  readonly surveyCommitteeUnitResource = httpResource<{
    surveyCommitteeMember: ISurveyCommitteeItem;
  }>(() => {
    const id = this.surveyCommitteeId();

    return id && id !== EMPTY_UUID ? `${this.basePath}/${id}` : undefined;
  });

  // ===========================
  // Preparing Data
  // ===========================

  readonly surveyCommitteeUnit = computed(() => {
    const item = this.surveyCommitteeUnitResource.value()?.surveyCommitteeMember;
    return item ? this.normalizeItem(item) : undefined;
  });

  // ===========================
  // Loading And Error of the Detail Api
  // ===========================

  readonly surveyCommitteeUnitLoading = computed(() =>
    this.surveyCommitteeUnitResource.isLoading(),
  );
  readonly surveyCommitteeUnitError = computed(() => this.surveyCommitteeUnitResource.error());

  // ===========================
  // List Actions
  // ===========================

  setSearchQuery(query: string) {
    this.searchQuery.set(query);
    this.pageIndex.set(0);
  }

  setPage(index: number) {
    this.pageIndex.set(index);
  }

  setPageSize(items: number) {
    this.pageSize.set(items);
  }

  setSort(sort: string, direction: 'asc' | 'desc') {
    this.sortOn.set(sort);
    this.sortDirection.set(direction);
    this.pageIndex.set(0);
  }

  refreshList() {
    this.surveyCommitteeUnitsResource.reload();
  }

  // ===========================
  // Detail Actions
  // ===========================
  setSurveyCommitteeId(id: string | undefined) {
    if (this.surveyCommitteeId() !== id) {
      this.surveyCommitteeId.set(id);
    }
  }

  refreshDetail() {
    this.surveyCommitteeUnitResource.reload();
  }

  private normalizeItem(item: ISurveyCommitteeItem): ISurveyCommitteeItem {
    return {
      ...item,
      assignedFrom: item.assignedFrom ? new Date(item.assignedFrom) : null,
      assignedTo: item.assignedTo ? new Date(item.assignedTo) : null,
      auditInfo: item.auditInfo
        ? {
            ...item.auditInfo,
            createdOn: item.auditInfo.createdOn ? new Date(item.auditInfo.createdOn) : null,
            lastModifiedOn: item.auditInfo.lastModifiedOn
              ? new Date(item.auditInfo.lastModifiedOn)
              : null,
          }
        : null,
    };
  }
}
