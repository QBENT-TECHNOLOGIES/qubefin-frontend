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
import { ICandidateSearchModel } from '../../models/candidate';
import { Sort } from '@angular/material/sort';
import { PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { CompanyStore } from '../../../global/stores/company-store';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
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
  readonly isViewMode = signal<boolean>(true);
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
  }
  protected onEdit() {
    this.isViewMode.set(false);
  }
  protected onAdd() {
    this.isViewMode.set(false);
    this.selectedCandidateId.set(EMPTY_UUID);
  }
  protected closePanel() {
    this.selectedCandidateId.set(EMPTY_UUID);
    this.isViewMode.set(true);
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
