import { Component, computed, EventEmitter, input, Input, output, Output, signal } from '@angular/core';
import { ISalaryModel } from '../../../models/salary';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { APP_ICONS_MAP } from '../../../../../lucide-icons';
import { LucideDynamicIcon } from '@lucide/angular';
import { MatTableModule } from '@angular/material/table';

@Component({
	selector: 'qfin-salary-component-list',
	imports: [CommonModule, MatButtonModule,
		MatIconModule,
		MatTooltipModule, LucideDynamicIcon,
		MatTableModule,],
	templateUrl: './salary-component-list.html',
})
export class SalaryComponentList {
	onViewDetail = output<string>();
	data = input<ISalaryModel[]>([]);
	isCollapsed = input<boolean>(false);
	selectedId = signal<string>('');
	readonly iconMap = APP_ICONS_MAP;
	displayedColumns = computed(() => {
		if (this.isCollapsed()) {
			return ['name', 'action'];
		}
		return ['name', 'code', 'category', 'taxable', 'status', 'action'];
	});
	onDetailView(id: string) {
		this.selectedId.set(id);
		this.onViewDetail.emit(id);
	}
}
