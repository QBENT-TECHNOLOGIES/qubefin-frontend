import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { EMPTY_UUID, RouteMeta } from 'qubefin-core';
import { Breadcrumb } from '../../../../layouts/secure/breadcrumb/breadcrumb';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { SurveyStore } from '../../stores/survey-store';
import { SurveyUnitList } from '../../components/survey-unit/survey-unit-list/survey-unit-list';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { SurveyUnitView } from '../../components/survey-unit/survey-unit-view/survey-unit-view';
import { SurveyUnitDetail } from '../../components/survey-unit/survey-unit-detail/survey-unit-detail';
import { BranchSurveyUnit } from '../../components/survey-unit/branch-survey-unit/branch-survey-unit';

@Component({
  selector: 'qfin-survey-unit',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatIconModule,
    MatTooltipModule,
    LucideDynamicIcon,
    Breadcrumb,
    CommonModule,
    SurveyUnitList,
    SurveyUnitView,
    SurveyUnitDetail,
    BranchSurveyUnit,
  ],
  templateUrl: './survey-unit.html',
  styles: ``,
})
export class SurveyUnit {
  // ===========================
  // Constants
  // ===========================
  public readonly EMPTY_UUID = EMPTY_UUID;
  readonly iconMap = APP_ICONS_MAP;
  // ===========================
  // Dependency Injection
  // ===========================
  readonly surveyStore = inject(SurveyStore);
  private readonly router = inject(Router);
  // ===========================
  // Component State
  // ===========================
  readonly isViewMode = signal<boolean>(true);
  readonly isCompleteSurveyMode = signal<boolean>(false);
  readonly hasSurveyCompleteAccess = signal<{ hasAccess: boolean, type: string }>({ hasAccess: false, type: '' });
  readonly showFilterArea = signal<boolean>(false);
  readonly selectedsurveyStoreId = signal<string>(EMPTY_UUID);
  // ===========================
  // Store Data
  // ===========================
  readonly surveys = this.surveyStore.surveyUnits;
  readonly hasSelectedsurveyStore = computed(
    () => this.selectedsurveyStoreId() !== EMPTY_UUID || (!this.isViewMode() && !this.isCompleteSurveyMode()),
  );
  // ===========================
  // Search State
  // ===========================
  readonly searchText = signal<string>('');

  // ===========================
  // Panel Actions
  // ===========================
  protected onView(id: string) {
    this.selectedsurveyStoreId.set(id);
    this.isViewMode.set(true);
    this.isCompleteSurveyMode.set(false);
  }
  protected onEdit() {
    this.isViewMode.set(false);
    this.isCompleteSurveyMode.set(false);
  }
  protected onAdd() {
    this.isViewMode.set(false);
    this.selectedsurveyStoreId.set(EMPTY_UUID);
    this.isCompleteSurveyMode.set(false);
  }
  protected closePanel() {
    this.selectedsurveyStoreId.set(EMPTY_UUID);
    this.isViewMode.set(true);
    this.isCompleteSurveyMode.set(false);
  }

  protected goToCompleteSurvey() {
    this.isCompleteSurveyMode.set(true);
    this.isViewMode.set(false);
  }

  // ===========================
  // Filter Actions
  // ===========================
  protected toggleFilterArea() {
    this.showFilterArea.update((v) => !v);
  }
  protected applyFilters() {
    this.surveyStore.setSearchQuery(this.searchText());
  }
  protected resetFilters() {
    this.searchText.set('');
    this.applyFilters();
  }

  // ===========================
  // Table Actions
  // ===========================
  protected changePage(delta: number) {
    const current = this.surveyStore.pageIndex();
    const next = current + delta;
    if (next >= 0) {
      this.surveyStore.setPage(next);
    }
  }
  pageChanged(event: PageEvent) {
    this.surveyStore.setPage(event.pageIndex);
    this.surveyStore.setPageSize(event.pageSize);
  }
  onSortChanged(sort: Sort) {
    if (!sort.direction) {
      return;
    }

    this.surveyStore.setSort(sort.active, sort.direction as 'asc' | 'desc');
  }
  // ===========================
  // Form Events
  // ===========================
  protected onSurvey() {
    this.closePanel();
  }

  updateSurveyAccess(isAccess: boolean, type: string) {
    this.hasSurveyCompleteAccess.set({ hasAccess: isAccess, type: type.toLowerCase() });
    console.log(this.hasSurveyCompleteAccess());
  }
}
