import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { ISurveyDetail, ISurveySearchResult } from '../models/survey';
import { Utility } from '../../hrms/models/employee-detail';

@Injectable({
  providedIn: 'root',
})
export class SurveyStore {
  // ===========================
  // ApiBase Path
  // ===========================
  private readonly basePath = `${ApiPaths.GLOBAL}/surveys`;

  // ===========================
  // List State
  // ===========================
  private readonly surveyId = signal<string | undefined>(undefined);

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
  readonly surveyUnitsResource = httpResource<{
    results: ISurveySearchResult[];
    totalRecords: number;
  }>(() => ({
    url: `${this.basePath}` + '/search',
    method: 'POST',
    body: {
      searchText: this.searchQuery(),
      sortOn: this.sortOn(),
      sortDirection: this.sortDirection(),
      pageIndex: this.pageIndex(),
      pageSize: this.pageSize(),
    },
  }));

  // ===========================
  // Preparing Data
  // ===========================

  readonly surveyUnits = computed(() =>
    (this.surveyUnitsResource.value()?.results ?? []).map(this.normalizeListItem),
  );

  readonly totalRecords = computed(() => this.surveyUnitsResource.value()?.totalRecords ?? 0);

  // ===========================
  // Loading And Error of the List Api
  // ===========================

  readonly loading = computed(() => this.surveyUnitsResource.isLoading());
  readonly error = computed(() => this.surveyUnitsResource.error());

  // ===========================
  // Detail Api Call And Response
  // ===========================

  readonly surveyUnitResource = httpResource<{
    surveyResponse: ISurveyDetail;
  }>(() => {
    const id = this.surveyId();

    return id && id !== EMPTY_UUID ? `${this.basePath}/${id}` : undefined;
  });

  // ===========================
  // Preparing Data
  // ===========================
  readonly surveyUnit = computed(() => {
    const item = this.surveyUnitResource.value()?.surveyResponse;
    return item ? this.normalizeItem(item) : undefined;
  });

  // ===========================
  // Loading And Error of the Detail Api
  // ===========================

  readonly surveyUnitLoading = computed(() => this.surveyUnitResource.isLoading());
  readonly surveyUnitError = computed(() => this.surveyUnitResource.error());

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
    this.surveyUnitsResource.reload();
  }

  //   // ===========================
  //   // Detail Actions
  //   // ===========================
  setSurveyId(id: string | undefined) {
    if (this.surveyId() !== id) {
      this.surveyId.set(id);
    }
  }

  refreshDetail() {
    this.surveyUnitResource.reload();
  }

  private normalizeListItem(item: ISurveySearchResult): ISurveySearchResult {
    return {
      ...item,
      assignmentDate: new Date(item.assignmentDate),
    };
  }
  private normalizeItem(item: ISurveyDetail): ISurveyDetail {
    return {
      ...item,
      assignmentDate: new Date(item.assignmentDate),
      tentativeSubmissionDate: item.tentativeSubmissionDate
        ? new Date(item.tentativeSubmissionDate)
        : null,
      surveyAssigneds: (item.surveyAssigneds ?? []).map((member) => ({
        employeeId: member.employeeId,
        employeeName: member.employeeName,
        isLead: member.isLead,
      })),
    };
  }

  // --- UTILITY SERVICE ---
  private readonly utilityResource = httpResource<Utility[]>(() => {
    return `${ApiPaths.GLOBAL}/utilities`;
  });

  readonly utilityComponent = computed<Utility[]>(() => this.utilityResource.value() ?? []);

  readonly utilityComponentLoading = computed(() => this.utilityResource.isLoading());
  readonly utilityComponentError = computed(() => this.utilityResource.error());
}
