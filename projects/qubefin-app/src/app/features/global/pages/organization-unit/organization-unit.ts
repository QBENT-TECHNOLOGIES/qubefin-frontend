import { Component, effect, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EMPTY_UUID, PermissionStore, RouteDataService, RouteMeta } from 'qubefin-core';
import { OrganizationUnitStore } from '../../stores/organization-unit-store';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { OrganizationUnitTreeComponent } from '../../components/organization-unit-tree/organization-unit-tree';
import { OrganizationUnitViewComponent } from '../../components/organization-unit-view/organization-unit-view';
import { OrganizationUnitDetailComponent } from '../../components/organization-unit-detail/organization-unit-detail';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { LucideDynamicIcon } from '@lucide/angular';

@Component({
  selector: 'qfin-organization-unit-page',
  imports: [OrganizationUnitTreeComponent, OrganizationUnitViewComponent, OrganizationUnitDetailComponent, LucideDynamicIcon],
  templateUrl: './organization-unit.html'
})
export class OrganizationUnitPage {
	private readonly route = inject(ActivatedRoute);
	private readonly routeDataService = inject(RouteDataService);

	readonly permissionStore = inject(PermissionStore);
	readonly organizationUnitStore = inject(OrganizationUnitStore);

	readonly iconMap = APP_ICONS_MAP;

	isViewMode = signal<boolean>(true);
	selectedOrganizationUnitId = signal<string>(EMPTY_UUID);
	organizationUnitTreeNodes = this.organizationUnitStore.organizationUnitTree;

	private routeData = toSignal(this.route.data as Observable<RouteMeta>, {
		initialValue: { title: '', icon: '' }
	});

	constructor() {
		effect(() => {
			this.routeDataService.setRouteData(this.routeData());
			if (this.organizationUnitTreeNodes().length > 0) {
				this.selectedOrganizationUnitId.set(this.organizationUnitTreeNodes()[0].id);
			}
		});
	}

	protected onAdd() {
		this.isViewMode.set(false);
		this.selectedOrganizationUnitId.set(EMPTY_UUID);
	}

	protected viewDetail(id: string) {
		this.selectedOrganizationUnitId.set(id);
	}

	protected onEdit() {
		this.isViewMode.set(false);
	}
}
