import { Component, computed, effect, inject, model, output, signal } from '@angular/core';
import { SalaryStore } from '../../../stores/salary-store';
import { EMPTY_UUID } from 'qubefin-core';
import { LucideUserCheck, LucideCalendarPlus, LucideUserCog, LucideCalendarClock, LucideUser, LucideLayers, LucideBuilding2, LucideMapPinned, LucideLandmark, LucideFactory, LucideSquarePen, LucidePiggyBank, LucideCheck, LucideLayoutGrid, LucideListOrdered, LucideShieldPlus, LucideTag, LucideWallet, LucideX, LucideDynamicIcon } from '@lucide/angular';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatePipe } from '@angular/common';
import { APP_ICONS_MAP } from '../../../../../lucide-icons';
import { ISalaryModel } from '../../../models/salary';

@Component({
	selector: 'qfin-salary-component-view',
	imports: [MatIconModule,
		DatePipe,
		MatTooltipModule,
		LucideDynamicIcon],
	templateUrl: './salary-component-view.html',
})
export class SalaryComponentView {
	salaryStore = inject(SalaryStore);
	salaryId = model<string>(EMPTY_UUID);
	showEdit = output<boolean>();
	//salaryDetail = this.salaryStore.salaryComponent;
	readonly iconMap = APP_ICONS_MAP;

	readonly salaryDetail = computed(() => this.salaryComponentCache());

	private readonly salaryComponentCache = signal<ISalaryModel | undefined>(undefined);

	constructor() {
		effect(() => {
			if (this.salaryId() && this.salaryId() !== EMPTY_UUID) {
				this.salaryStore.setSalaryComponentId(this.salaryId());
			}
		});

		effect(() => {
			const value = this.salaryStore.salaryComponent;

			if (value) {
				this.salaryComponentCache.set(value());
			}
		});
	}
	onShowEdit() {
		this.showEdit.emit(true);
	}
}
