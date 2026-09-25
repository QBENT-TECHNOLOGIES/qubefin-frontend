import { Component, computed, inject, signal } from '@angular/core';
import { EMPTY_UUID } from 'qubefin-core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { CommonModule, DatePipe } from '@angular/common';
import { CandidateList } from '../../components/interview-process/candidate/candidate-list/candidate-list';
import { CandidateView } from '../../components/interview-process/candidate/candidate-view/candidate-view';
import { CandidateDetail } from '../../components/interview-process/candidate/candidate-detail/candidate-detail';
import { CandidateStore } from '../../stores/candidate-store';
import { form, FormField } from '@angular/forms/signals';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ICandidate, ICandidateSearchModel } from '../../models/candidate';
import { Sort } from '@angular/material/sort';
import { PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { CompanyStore } from '../../../global/stores/company-store';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { CandidateJoiningInfo } from '../../components/interview-process/candidate/candidate-joining-info/candidate-joining-info';
@Component({
  selector: 'qfin-candidate-component',
  imports: [
    FormField,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatIconModule,
    MatTooltipModule,
    LucideDynamicIcon,
    CommonModule,
    CandidateList,
    CandidateView,
    CandidateDetail,
    CandidateJoiningInfo,
  ],
  providers: [provideNativeDateAdapter(), DatePipe],
  templateUrl: './candidate-component.html',
  styles: ``,
})
export class CandidateComponent {
  readonly dateAdapter = inject(DateAdapter<Date>);
  public readonly EMPTY_UUID = EMPTY_UUID;
  readonly candidateStore = inject(CandidateStore);
  readonly companyStore = inject(CompanyStore);
  readonly isUpdateMode = signal<boolean>(false);
  readonly isViewMode = signal<boolean>(true);
  /** Candidate form is open on an existing candidate (basic details edit). */
  readonly isEditDetailsMode = signal<boolean>(false);
  readonly showFilterArea = signal<boolean>(false);
  readonly selectedCandidateId = signal<string>(EMPTY_UUID);
  readonly candidates = this.candidateStore.candidates;
  readonly hasSelectedCandidate = computed(
    () => this.selectedCandidateId() !== EMPTY_UUID || !this.isViewMode(),
  );

  readonly searchModel = signal<ICandidateSearchModel>({
    tempSearch: '',
    companyId: '',
  });
  readonly companies = this.companyStore.companies;
  readonly searchForm = form(this.searchModel);
  protected onView(id: string) {
    this.selectedCandidateId.set(id);
    this.isViewMode.set(true);
    this.isUpdateMode.set(false);
    this.isEditDetailsMode.set(false);
  }
  // Opens the candidate form on the selected candidate to edit its basic details.
  protected onEditDetails(id: string) {
    this.selectedCandidateId.set(id);
    this.isViewMode.set(false);
    this.isUpdateMode.set(false);
    this.isEditDetailsMode.set(true);
  }
  // Leaving the edit form goes back to that candidate's view, not the list.
  protected onEditDetailsDone() {
    const id = this.selectedCandidateId();
    this.candidateStore.refreshDetail();
    this.onView(id);
  }
  // Opens the joining information form for the candidate (Add Additional Info).
  protected onEdit(candidate: ICandidate) {
    this.selectedCandidateId.set(candidate.id);

    this.isViewMode.set(false);
    this.isUpdateMode.set(true);
  }
  protected onAdd() {
    this.isViewMode.set(false);
    this.isEditDetailsMode.set(false);
    this.selectedCandidateId.set(EMPTY_UUID);
    this.isUpdateMode.set(false);
  }
  protected closePanel() {
    this.isEditDetailsMode.set(false);
    this.selectedCandidateId.set(EMPTY_UUID);
    this.isViewMode.set(true);
    this.isUpdateMode.set(false);
  }
  protected toggleFilterArea() {
    this.showFilterArea.update((v) => !v);
  }
  protected applyFilters() {
    const companyId = this.searchForm.companyId().value().trim();
    this.candidateStore.setSearchQuery(this.searchForm.tempSearch().value());
    this.candidateStore.setCompanyId(companyId);
  }
  protected resetFilters() {
    this.searchModel.update((m) => ({
      ...m,
      tempSearch: '',
      companyId: '',
    }));
    this.applyFilters();
  }
  protected changePage(delta: number) {
    const current = this.candidateStore.pageIndex();
    const next = current + delta;
    if (next >= 0) {
      this.candidateStore.setPage(next);
    }
  }
  pageChanged(event: PageEvent) {
    this.candidateStore.setPage(event.pageIndex);
    this.candidateStore.setPageSize(event.pageSize);
  }
  onSortChanged(sort: Sort) {
    if (!sort.direction) {
      return;
    }
    this.candidateStore.setSort(sort.active, sort.direction as 'asc' | 'desc');
  }
}
