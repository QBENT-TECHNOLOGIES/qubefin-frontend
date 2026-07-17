import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { ApiPaths, EMPTY_UUID } from 'qubefin-core';
import { ISurveyDetail, ISurveySearchResult } from '../models/survey';

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
    surveys: ISurveySearchResult[];
    totalRecords: number;
  }>(() => ({
    url: `${this.basePath}`,
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
  public demoSurveyList: ISurveySearchResult[] = [
    {
      id: '8f5b8f1d-9b3f-4f2d-a8d4-1b2c3d4e5f67',
      assignmentNo: 'ASG-2026-001',
      assignmentDate: new Date('2026-07-17'),
      surveyType: 'Land Survey',
      status: true,
      totalCount: 12,
    },
    {
      id: '2d9b1c4f-3a67-4d0a-9c5d-123456789abc',
      assignmentNo: 'ASG-2026-002',
      assignmentDate: new Date('2026-07-18'),
      surveyType: 'Building Survey',
      status: false,
      totalCount: 8,
    },
    {
      id: '4c5d6e7f-1234-5678-90ab-cdef12345678',
      assignmentNo: 'ASG-2026-003',
      assignmentDate: new Date('2026-07-20'),
      surveyType: 'Road Survey',
      status: true,
      totalCount: 15,
    },
    {
      id: '9a8b7c6d-5e4f-3210-abcd-ef9876543210',
      assignmentNo: 'ASG-2026-004',
      assignmentDate: new Date('2026-07-22'),
      surveyType: 'Bridge Survey',
      status: true,
      totalCount: 6,
    },
    {
      id: '12345678-90ab-cdef-1234-567890abcdef',
      assignmentNo: 'ASG-2026-005',
      assignmentDate: new Date('2026-07-25'),
      surveyType: 'Pipeline Survey',
      status: false,
      totalCount: 10,
    },
    {
      id: 'abcdef12-3456-7890-abcd-ef1234567890',
      assignmentNo: 'ASG-2026-006',
      assignmentDate: new Date('2026-07-28'),
      surveyType: 'Forest Survey',
      status: true,
      totalCount: 18,
    },
  ];
  readonly surveyUnits = computed(() => (this.demoSurveyList ?? []).map(this.normalizeListItem));

  // readonly surveyUnits = computed(() =>
  //   (this.surveyUnitsResource.value()?.surveys ?? []).map(this.normalizeListItem),
  // );

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
    surveyMember: ISurveyDetail;
  }>(() => {
    const id = this.surveyId();

    return id && id !== EMPTY_UUID ? `${this.basePath}/${id}` : undefined;
  });

  // ===========================
  // Preparing Data
  // ===========================
  public demoData: ISurveyDetail = {
    id: '8f5b8f1d-9b3f-4f2d-a8d4-1b2c3d4e5f67',
    sequence: 1,
    surveyType: 'Land Survey',
    assignmentNo: 'ASG-2026-001',
    assignmentDate: new Date('2026-07-17'),
    proposedArea: 'North Zone - Sector 5',
    countryId: 'a12c34d5-e678-4f90-b123-456789abcdef',
    stateId: 'a12c34d5-e678-4f90-b123-456789abcdef',
    districtId: 'a12c34d5-e678-4f90-b123-456789abcdef',
    administrativeUnitId: 'a12c34d5-e678-4f90-b123-456789abcdef',
    administrativeUnitName: 'North Administrative Unit',
    tentativeSubmissionDate: new Date('2026-08-15'),
    surveyMembers: [
      {
        employeeId: 'e1234567-1111-2222-3333-444444444444',
        name: 'Rohit Sharma',
        isLead: true,
      },
      {
        employeeId: 'e2345678-5555-6666-7777-888888888888',
        name: 'Ananya Das',
        isLead: false,
      },
      {
        employeeId: 'e3456789-9999-aaaa-bbbb-cccccccccccc',
        name: 'Amit Roy',
        isLead: false,
      },
    ],
  };
  readonly surveyUnit = computed(() => {
    const item = this.demoData;
    return item ? this.normalizeItem(item) : undefined;
  });
  // readonly surveyUnit = computed(() => {
  //   const item = this.surveyUnitResource.value()?.surveyMember;
  //   return item ? this.normalizeItem(item) : undefined;
  // });

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
    };
  }
}
