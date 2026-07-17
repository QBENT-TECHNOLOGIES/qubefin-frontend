import { Component,computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { LucideDynamicIcon } from '@lucide/angular';
import { RouteDataService } from 'qubefin-core';
import { APP_ICONS_MAP } from '../../../lucide-icons';

@Component({
  selector: 'qfin-breadcrumb',
  imports: [MatIconModule, LucideDynamicIcon ],
  templateUrl: './breadcrumb.html'
})
export class Breadcrumb {
  routeDataService = inject(RouteDataService);
  readonly iconMap = APP_ICONS_MAP;
  pageTitle = computed(() => this.routeDataService.routeData().title);
}
