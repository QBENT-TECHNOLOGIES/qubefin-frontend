import { SalaryStore } from './../../stores/salary-store';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { SalaryComponentList } from "../../components/salary-components/salary-component-list/salary-component-list";
import { SalaryComponentView } from "../../components/salary-components/salary-component-view/salary-component-view";
import { SalaryComponentDetail } from "../../components/salary-components/salary-component-detail/salary-component-detail";
import { EMPTY_UUID } from 'qubefin-core';
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { CommonModule } from '@angular/common';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
@Component({
	selector: 'qfin-salary-component',
	imports: [
		MatFormFieldModule,
		MatInputModule,
		MatSelectModule,
		FormsModule,
		SalaryComponentList,
		SalaryComponentView,
		SalaryComponentDetail,
		MatIconModule,
		MatButtonModule,
		MatTooltipModule,
		LucideDynamicIcon,
		CommonModule,
		MatSlideToggleModule,
	],
	templateUrl: './salary-component.html',
})
export class SalaryComponent {
	public readonly EMPTY_UUID = EMPTY_UUID;
	readonly iconMap = APP_ICONS_MAP;
	salaryStore = inject(SalaryStore);
	isViewMode = signal<boolean>(true);
	selectedSalaryComponentId = signal<string>(EMPTY_UUID);
	categories = this.salaryStore.categories;

	// Filter properties
	showFilterArea = signal<boolean>(false);

	// Applied filters
	searchQuery = signal<string>('');
	selectedCategory = signal<string>('');
	taxableFilter = signal<boolean | null>(null);

	// Form bindings
	tempSearch = '';
	tempCategory = '';
	tempTaxable: boolean | null = null;

	filteredSalaryComponents = computed(() => {
		let list = this.salaryStore.salaryComponents();
		const query = this.searchQuery().trim().toLowerCase();
		const cat = this.selectedCategory();
		const tax = this.taxableFilter();

		if (query) {
			list = list.filter(item =>
				(item.name && item.name.toLowerCase().includes(query)) ||
				(item.code && item.code.toLowerCase().includes(query))
			);
		}
		if (cat) {
			list = list.filter(item => item.categoryId === cat);
		}
		if (tax !== null) {
			list = list.filter(item => item.isTaxable === tax);
		}
		return list;
	});

	constructor() {
		this.salaryStore.loadCategories();
	}

	protected onView(id: string) {
		this.selectedSalaryComponentId.set(id);
		this.isViewMode.set(true);
	}

	protected onEdit() {
		this.isViewMode.set(false);
	}

	protected onAdd() {
		this.isViewMode.set(false);
		this.selectedSalaryComponentId.set(EMPTY_UUID);
	}

	protected closePanel() {
		this.selectedSalaryComponentId.set(EMPTY_UUID);
		this.isViewMode.set(true);
	}

	protected toggleFilterArea() {
		this.showFilterArea.update(v => !v);
	}

	protected toggleTempTaxable(val: boolean) {
		if (this.tempTaxable === val) {
			this.tempTaxable = null;
		} else {
			this.tempTaxable = val;
		}
	}

	protected applyFilters() {
		this.searchQuery.set(this.tempSearch);
		this.selectedCategory.set(this.tempCategory);
		// this.taxableFilter.set(this.tempTaxable);
	}

	protected resetFilters() {
		this.tempSearch = '';
		this.tempCategory = '';
		// this.tempTaxable = null;
		this.applyFilters();
	}

	getCategoryIcon(categoryName: string): any {
		switch (categoryName?.toLowerCase().trim()) {
			case 'deduction':
				return this.iconMap['BanknoteX'];

			case 'employer contribution':
				return this.iconMap['HandCoins'];

			case 'earning':
				return this.iconMap['BanknoteArrowUp'];

			default:
				return this.iconMap['Coins'];
		}
	}

	protected selectCategory(category: { id: string; name: string }) {
		if (this.selectedCategory() === category.id) {
			// Same category clicked → remove category filter
			this.selectedCategory.set('');
			this.tempCategory = '';
		} else {
			// New category clicked → apply filter
			this.selectedCategory.set(category.id);
			this.tempCategory = category.id;
		}
	}

	protected resetCategoryFilter() {
		this.selectedCategory.set('');
		this.tempCategory = '';
	}
}

