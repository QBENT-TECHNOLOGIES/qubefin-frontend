import { Component, input, output, signal } from '@angular/core';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { Role, RoleSearch } from '../../models/role';
import { CommonModule } from '@angular/common';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { LucideDynamicIcon } from '@lucide/angular';

@Component({
	selector: 'qfin-role-list-component',
	imports: [CommonModule, MatPaginatorModule, MatSortModule, MatTableModule, LucideDynamicIcon],
	templateUrl: './role-list.html'
})
export class RoleListComponent {
	onViewDetail = output<string>();

	selectedId = signal<string>('');
	readonly iconMap = APP_ICONS_MAP;

	isCollapsed = signal<boolean>(false);

	data = input<RoleSearch[]>([]);
	sortChange = output<Sort>();
	pageChange = output<PageEvent>();

	displayedColumns: string[] = ['index', 'name', 'status', 'actions'];

	constructor() {
	}

	onDetailView(id: string) {
		this.selectedId.set(id);
		this.onViewDetail.emit(id);
	}
}
