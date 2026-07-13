import { SalaryStore } from './../../stores/salary-store';
import { Component, effect, inject, signal } from '@angular/core';
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
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'qfin-salary-component',
  imports: [SalaryComponentList, SalaryComponentView, SalaryComponentDetail, MatIconModule, MatButtonModule, MatTooltipModule, LucideDynamicIcon, Breadcrumb, CommonModule],
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
  salaryComponents = this.salaryStore.salaryComponents;
  private routeData = toSignal(this.route.data as Observable<RouteMeta>, {
    initialValue: { title: '', icon: '' }
  });
  constructor() {
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
}
