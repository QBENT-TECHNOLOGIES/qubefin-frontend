import { Component, effect, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EMPTY_UUID, RouteDataService, RouteMeta } from 'qubefin-core';
import { MenuStore } from '../../stores/menu-store';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { MenuTreeComponent } from '../../components/menu-tree/menu-tree';
import { MenuViewComponent } from '../../components/menu-view/menu-view';

@Component({
  selector: 'qfin-menu-page',
  imports: [MenuTreeComponent, MenuViewComponent],
  templateUrl: './menu.html'
})
export class MenuPage {
	private readonly route = inject(ActivatedRoute);
	private readonly routeDataService = inject(RouteDataService);

	menuStore = inject(MenuStore);

	isViewMode = signal<boolean>(true);
	selectedMenuId = signal<string>(EMPTY_UUID);
	menuTreeNodes = this.menuStore.menuTree;

	private routeData = toSignal(this.route.data as Observable<RouteMeta>, {
		initialValue: { title: '', icon: '' }
	});

	constructor() {
		effect(() => {
			this.routeDataService.setRouteData(this.routeData());
			if (this.menuTreeNodes().length > 0) {
				this.selectedMenuId.set(this.menuTreeNodes()[0].id);
			}
		});
	}

	protected onAdd() {
		this.isViewMode.set(false);
		this.selectedMenuId.set(EMPTY_UUID);
	}

	protected viewDetail(id: string) {
		this.selectedMenuId.set(id);
	}

	protected onEdit() {
		this.isViewMode.set(false);
	}
}
