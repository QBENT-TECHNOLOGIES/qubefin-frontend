import { Component, computed, effect, inject, model, output, signal } from '@angular/core';
import { RoleStore } from '../../stores/role-store';
import { EMPTY_UUID } from 'qubefin-core';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { Role, RoleModel } from '../../models/role';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'qfin-role-view-component',
  imports: [DatePipe],
  templateUrl: './role-view.html'
})
export class RoleViewyComponent {
	roleStore = inject(RoleStore);

	roleId = model<string>(EMPTY_UUID);
	
	showEdit = output<boolean>();

	readonly iconMap = APP_ICONS_MAP;

	readonly role = computed(() => this.roleCache());

	private readonly roleCache = signal<Role | undefined>(undefined);

	constructor() {
		effect(() => {
			if (this.roleId() && this.roleId() !== EMPTY_UUID) {
				this.roleStore.setRoleId(this.roleId());
			}
		});

		effect(() => {
			const value = this.roleStore.role;

			if (value) {
				this.roleCache.set(value());
			}
		});
	}

	onShowEdit() {
		this.showEdit.emit(true);
	}
}
