import { Component, input, output, signal } from '@angular/core';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { Role } from '../../models/role';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';

@Component({
	selector: 'qfin-role-list-component',
	imports: [CommonModule, MatTableModule],
	templateUrl: './role-list.html'
})
export class RoleListComponent {
	onViewDetail = output<string>();

	selectedId = signal<string>('');
	readonly iconMap = APP_ICONS_MAP;

	isCollapsed = signal<boolean>(false);
	roles = input<Role[]>([]);

	displayedColumns: string[] = ['index', 'name', 'actions'];

	constructor() {
	}

	onDetailView(id: string) {
		this.selectedId.set(id);
		this.onViewDetail.emit(id);
	}
}
