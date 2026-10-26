import { httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import {
  IInterviewerCandidate,
  IInterviewerCandidateFilters,
  IInterviewerTabCounts,
} from '../models/interview-panel';

/** The Interview page list - only the signed-in interviewer's own interviews (the API takes the employee from
 * the token). Completed assessments are left out unless the interviewer searches by name / reference no. */
@Injectable({
  providedIn: 'root',
})
export class InterviewStore {
  readonly filters = signal<IInterviewerCandidateFilters>({
    searchText: '',
    status: null,
    interviewDate: null,
  });
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  readonly interviewsResource = httpResource<{
    interviews: IInterviewerCandidate[];
    totalRecords: number;
    counts: IInterviewerTabCounts;
  }>(() => ({
    url: `${ApiPaths.HRMS}/interviews/filter`,
    method: 'POST',
    body: {
      ...this.filters(),
      searchText: this.filters().searchText.trim() || null,
      pageIndex: this.pageIndex(),
      pageSize: this.pageSize(),
    },
  }));

  readonly interviews = computed(() => this.interviewsResource.value()?.interviews ?? []);
  readonly totalRecords = computed(() => this.interviewsResource.value()?.totalRecords ?? 0);
  readonly counts = computed<IInterviewerTabCounts>(
    () =>
      this.interviewsResource.value()?.counts ?? {
        allOpen: 0,
        today: 0,
        acknowledgementPending: 0,
        completed: 0,
      },
  );
  readonly loading = computed(() => this.interviewsResource.isLoading());
  readonly error = computed(() => this.interviewsResource.error());

  setFilters(filters: IInterviewerCandidateFilters) {
    this.filters.set(filters);
    this.pageIndex.set(0);
  }

  setPage(index: number, size: number) {
    this.pageIndex.set(index);
    this.pageSize.set(size);
  }

  refresh() {
    this.interviewsResource.reload();
  }
}
