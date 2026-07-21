import { Component, input, output, signal } from '@angular/core';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { Role, RoleSearch, RoleSearchResult } from '../../models/role';
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
	

	selectedId = signal<string>('');
	readonly iconMap = APP_ICONS_MAP;

	isCollapsed = signal<boolean>(false);

	readonly data = input.required<RoleSearchResult>();
    readonly pageIndex = input(0);
    readonly pageSize = input(1);

	readonly sortChange = output<Sort>();
	readonly pageChange = output<PageEvent>();
	readonly showDetail = output<string>();

	readonly displayedColumns: string[] = ['index', 'name', 'status', 'actions'];

	onDhowDetail(id: string) {
		this.selectedId.set(id);
		this.showDetail.emit(id);
	}
}
