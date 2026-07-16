import { SalaryStore } from './../../stores/salary-store';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SalaryComponentList } from "../../components/salary-components/salary-component-list/salary-component-list";
import { SalaryComponentView } from "../../components/salary-components/salary-component-view/salary-component-view";
import { SalaryComponentDetail } from "../../components/salary-components/salary-component-detail/salary-component-detail";
import { EMPTY_UUID, RouteDataService, RouteMeta } from 'qubefin-core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { Breadcrumb } from '../../../../layouts/secure/breadcrumb/breadcrumb';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { CommonModule } from '@angular/common';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';

@Component({
  selector: 'qfin-salary-component',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    FormsModule,
    SalaryComponentList,
    SalaryComponentView,
    SalaryComponentDetail,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    LucideDynamicIcon,
    Breadcrumb,
    CommonModule,
    MatSlideToggleModule
  ],
  templateUrl: './salary-component.html',
})
export class SalaryComponent {
  public readonly EMPTY_UUID = EMPTY_UUID;
  private readonly route = inject(ActivatedRoute);
  private readonly routeDataService = inject(RouteDataService);
  readonly iconMap = APP_ICONS_MAP;
  salaryStore = inject(SalaryStore);
  isViewMode = signal<boolean>(true);
  selectedSalaryComponentId = signal<string>(EMPTY_UUID);
  categories = this.salaryStore.categories;

  // Filter properties
  showFilterArea = signal<boolean>(false);
  
  // Applied filters
  searchQuery = signal<string>('');
  selectedCategory = signal<string>('');
  taxableFilter = signal<boolean | null>(null);

  // Form bindings
  tempSearch = '';
  tempCategory = '';
  tempTaxable: boolean | null = null;

  filteredSalaryComponents = computed(() => {
    let list = this.salaryStore.salaryComponents();
    const query = this.searchQuery().trim().toLowerCase();
    const cat = this.selectedCategory();
    const tax = this.taxableFilter();

    if (query) {
      list = list.filter(item =>
        (item.name && item.name.toLowerCase().includes(query)) ||
        (item.code && item.code.toLowerCase().includes(query))
      );
    }
    if (cat) {
      list = list.filter(item => item.categoryId === cat);
    }
    if (tax !== null) {
      list = list.filter(item => item.isTaxable === tax);
    }
    return list;
  });

  private routeData = toSignal(this.route.data as Observable<RouteMeta>, {
    initialValue: { title: '', icon: '' }
  });

  constructor() {
    this.salaryStore.loadCategories();
    effect(() => {
      this.routeDataService.setRouteData(this.routeData());
    });
  }

  protected onView(id: string) {
    this.selectedSalaryComponentId.set(id);
    this.isViewMode.set(true);
  }

  protected onEdit() {
    this.isViewMode.set(false);
  }

  protected onAdd() {
    this.isViewMode.set(false);
    this.selectedSalaryComponentId.set(EMPTY_UUID);
  }

  protected closePanel() {
    this.selectedSalaryComponentId.set(EMPTY_UUID);
    this.isViewMode.set(true);
  }

  protected toggleFilterArea() {
    this.showFilterArea.update(v => !v);
  }

  protected toggleTempTaxable(val: boolean) {
    if (this.tempTaxable === val) {
      this.tempTaxable = null;
    } else {
      this.tempTaxable = val;
    }
  }

  protected applyFilters() {
    this.searchQuery.set(this.tempSearch);
    this.selectedCategory.set(this.tempCategory);
    // this.taxableFilter.set(this.tempTaxable);
  }

  protected resetFilters() {
    this.tempSearch = '';
    this.tempCategory = '';
    // this.tempTaxable = null;
    this.applyFilters();
  }
}

