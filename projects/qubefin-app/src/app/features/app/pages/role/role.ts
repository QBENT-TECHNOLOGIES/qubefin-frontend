import { Component, effect, inject, signal } from '@angular/core';
import { RoleListComponent } from '../../components/role-list/role-list';
import { ActivatedRoute } from '@angular/router';
import { EMPTY_UUID, RouteDataService, RouteMeta } from 'qubefin-core';
import { RoleStore } from '../../stores/role-store';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { Breadcrumb } from '../../../../layouts/secure/breadcrumb/breadcrumb';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'qfin-role-page',
	imports: [CommonModule, RoleListComponent],
	templateUrl: './role.html'
})
export class RolePage {
	public readonly EMPTY_UUID = EMPTY_UUID;
	private readonly route = inject(ActivatedRoute);
	private readonly routeDataService = inject(RouteDataService);

	roleStore = inject(RoleStore);

	isViewMode = signal<boolean>(true);
	showFilterArea = signal<boolean>(false);
	selectedRoleId = signal<string>(EMPTY_UUID);
	roles = this.roleStore.roles;

	private routeData = toSignal(this.route.data as Observable<RouteMeta>, {
		initialValue: { title: '', icon: '' }
	});

	constructor() {
		effect(() => {
			this.routeDataService.setRouteData(this.routeData());
		});
	}

	protected onAdd() {
		this.isViewMode.set(false);
		this.selectedRoleId.set(EMPTY_UUID);
	}

	protected viewDetail(id: string) {
		this.selectedRoleId.set(id);
	}
}
