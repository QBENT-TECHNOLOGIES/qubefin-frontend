import { EMPTY_UUID, RouteDataService, RouteMeta } from 'qubefin-core';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  LucideChevronLeft,
  LucideChevronRight,
  LucideDynamicIcon,
} from '@lucide/angular';
import { Breadcrumb } from '../../../../layouts/secure/breadcrumb/breadcrumb';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { Observable } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { SurveyCommitteeStore } from '../../stores/survey-committee-store';
import { SurveyCommitteeUnitList } from '../../components/survey-committee-unit-list/survey-committee-unit-list';
import { SurveyCommitteeUnitView } from '../../components/survey-committee-unit-view/survey-committee-unit-view';
import { SurveyCommitteeUnitDetail } from '../../components/survey-committee-unit-detail/survey-committee-unit-detail';

@Component({
  selector: 'qfin-survey-committee-unit',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatIconModule,
    MatTooltipModule,
    LucideDynamicIcon,
    LucideChevronLeft,
    LucideChevronRight,
    Breadcrumb,
    CommonModule,
    SurveyCommitteeUnitList,
    SurveyCommitteeUnitView,
    SurveyCommitteeUnitDetail,
  ],
  templateUrl: './survey-committee-unit.html',
  styles: ``,
})
export class SurveyCommitteeUnit {
  public readonly EMPTY_UUID = EMPTY_UUID;
  private readonly route = inject(ActivatedRoute);
  private readonly routeDataService = inject(RouteDataService);
  readonly iconMap = APP_ICONS_MAP;

  readonly surveyCommitteeStore = inject(SurveyCommitteeStore);
  readonly isViewMode = signal<boolean>(true);
  readonly selectedSurveyCommitteeId = signal<string>(EMPTY_UUID);
  readonly surveyCommittees = this.surveyCommitteeStore.surveyCommitteeUnits;
  readonly hasSelectedSurveyCommittee = computed(
    () => this.selectedSurveyCommitteeId() !== EMPTY_UUID || !this.isViewMode(),
  );

  readonly showFilterArea = signal<boolean>(false);
  tempSearch = '';

  private readonly routeData = toSignal(this.route.data as Observable<RouteMeta>, {
    initialValue: { title: '', icon: '' },
  });

  constructor() {
    effect(() => {
      this.routeDataService.setRouteData(this.routeData());
    });

    effect(() => {
      this.surveyCommitteeStore.setSurveyCommitteeId(this.selectedSurveyCommitteeId());
    });
  }

  protected onView(id: string) {
    this.selectedSurveyCommitteeId.set(id);
    this.isViewMode.set(true);
  }

  protected onEdit() {
    this.isViewMode.set(false);
  }

  protected onAdd() {
    this.isViewMode.set(false);
    this.selectedSurveyCommitteeId.set(EMPTY_UUID);
  }

  protected closePanel() {
    this.selectedSurveyCommitteeId.set(EMPTY_UUID);
    this.isViewMode.set(true);
  }

  protected toggleFilterArea() {
    this.showFilterArea.update((v) => !v);
  }

  protected applyFilters() {
    this.surveyCommitteeStore.setSearchQuery(this.tempSearch);
  }

  protected resetFilters() {
    this.tempSearch = '';
    this.applyFilters();
  }

  protected changePage(delta: number) {
    const current = this.surveyCommitteeStore.pageIndex();
    const next = current + delta;
    if (next >= 0) {
      this.surveyCommitteeStore.setPage(next);
    }
  }

  protected onSaveCommittee() {
    this.closePanel();
  }
}
