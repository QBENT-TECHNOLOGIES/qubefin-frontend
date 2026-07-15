import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { SurveyCommitteeItem } from '../models/survey-committee-item';

@Injectable({
  providedIn: 'root',
})
export class SurveyCommitteeStore {
  // Detail State
  private readonly surveyCommitteeId = signal<string | undefined>(undefined);

  // List State
  readonly searchQuery = signal('');
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly sortOn = signal('assignedFrom');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');

  private readonly basePath = `${ApiPaths.GLOBAL}/survey-committees`;

  // List Resource
  readonly surveyCommitteeUnitsResource = httpResource<{
    surveyCommittees: any[];
    totalRecords: number;
  }>(() => {
    const search = encodeURIComponent(this.searchQuery());
    const page = this.pageIndex();
    const size = this.pageSize();
    const sort = this.sortOn();
    const dir = this.sortDirection();

    return `${this.basePath}/filter?searchText=${search}&sortOn=${sort}&sortDirection=${dir}&pageIndex=${page}&pageSize=${size}`;
  });

  readonly surveyCommitteeUnits = computed(() =>
    (this.surveyCommitteeUnitsResource.value()?.surveyCommittees ?? []).map((item) =>
      this.normalizeItem(item),
    ),
  );

  readonly totalRecords = computed(
    () => this.surveyCommitteeUnitsResource.value()?.totalRecords ?? 0,
  );

  readonly totalPages = computed(() => Math.ceil(this.totalRecords() / this.pageSize()));

  readonly loading = computed(() => this.surveyCommitteeUnitsResource.isLoading());
  readonly error = computed(() => this.surveyCommitteeUnitsResource.error());

  // Detail Resource
  private readonly surveyCommitteeUnitResource = httpResource<{
    surveyCommitteeMember: any;
  }>(() => {
    const id = this.surveyCommitteeId();

    if (!id || id === EMPTY_UUID) {
      return undefined;
    }

    return `${this.basePath}/${id}`;
  });

  readonly surveyCommitteeUnit = computed(() => {
    const item = this.surveyCommitteeUnitResource.value()?.surveyCommitteeMember;

    return item ? this.normalizeItem(item) : undefined;
  });

  readonly surveyCommitteeUnitLoading = computed(() =>
    this.surveyCommitteeUnitResource.isLoading(),
  );

  readonly surveyCommitteeUnitError = computed(() => this.surveyCommitteeUnitResource.error());

  // State Setters

  setSearchQuery(query: string) {
    this.searchQuery.set(query);
    this.pageIndex.set(0);
  }

  setPage(index: number) {
    this.pageIndex.set(index);
  }

  setPageSize(size: number) {
    this.pageSize.set(size);
    this.pageIndex.set(0);
  }

  setSort(field: string, direction: 'asc' | 'desc') {
    this.sortOn.set(field);
    this.sortDirection.set(direction);
  }

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

  private normalizeItem(item: any): SurveyCommitteeItem {
    return {
      ...item,
      assignedFrom: item.assignedFrom
        ? new Date(item.assignedFrom)
        : (item.assignedFrom as unknown as Date),
      assignedTo: item.assignedTo
        ? new Date(item.assignedTo)
        : (item.assignedTo as unknown as Date),
    } as SurveyCommitteeItem;
  }
}
