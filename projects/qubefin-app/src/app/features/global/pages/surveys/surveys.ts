import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { Breadcrumb } from '../../../../layouts/secure/breadcrumb/breadcrumb';
import { ActivatedRoute } from '@angular/router';
import { EMPTY_UUID, RouteDataService, RouteMeta } from 'qubefin-core';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { Observable } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { SurveyStore } from '../../stores/survey-store';

@Component({
  selector: 'qfin-surveys',
  imports: [
    CommonModule, MatFormFieldModule, MatInputModule, FormsModule, Breadcrumb, MatIconModule, MatButtonModule, LucideDynamicIcon,
    MatTooltipModule,
  ],
  templateUrl: './surveys.html',
  styles: ``,
})
export class Surveys {
  public readonly EMPTY_UUID = EMPTY_UUID;
  private readonly route = inject(ActivatedRoute);
  private readonly routeDataService = inject(RouteDataService);
  readonly iconMap = APP_ICONS_MAP;
  isViewMode = signal<boolean>(true);
  selectedSurveyId = signal<string>(EMPTY_UUID);
  showFilterArea = signal<boolean>(false);
  readonly surveyStore = inject(SurveyStore);

  private routeData = toSignal(this.route.data as Observable<RouteMeta>, {
    initialValue: { title: '', icon: '' }
  });

  protected onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.surveyStore.setSearchQuery(input.value);
  }

  protected onView(id: string) {
    this.selectedSurveyId.set(id);
    this.isViewMode.set(true);
  }

  protected onEdit() {
    this.isViewMode.set(false);
  }

  protected onAdd() {
    this.isViewMode.set(false);
    this.selectedSurveyId.set(EMPTY_UUID);
  }

  protected closePanel() {
    this.selectedSurveyId.set(EMPTY_UUID);
    this.isViewMode.set(true);
  }
   // Closes panels and forces state reset safely
  protected handleCancel() {
    this.selectedSurveyId.set(EMPTY_UUID);
    this.isViewMode.set(true);
  }

  // Executed on successful API responses from employee-component-detail
  protected handleSave() {
    this.selectedSurveyId.set(EMPTY_UUID);
    this.isViewMode.set(true);
  }

  protected toggleFilterArea() {
    this.showFilterArea.update(v => !v);
  }

  protected applyFilters() {
  }

  protected resetFilters() {
    this.applyFilters();
  }
}
