import { Component, effect, inject, signal } from '@angular/core';
import { EMPTY_UUID } from 'qubefin-core';
import { UserSearchParam } from '../../models/user';
import { UserStore } from '../../stores/user-store';
import { form } from '@angular/forms/signals';
import { Sort } from '@angular/material/sort';
import { PageEvent } from '@angular/material/paginator';
import { CommonModule } from '@angular/common';
import { UserListComponent } from '../../components/users/user-list/user-list';
import { UserView } from '../../components/users/user-view/user-view';
import { UserDetail } from '../../components/users/user-detail/user-detail';
import { LucideDynamicIcon } from '@lucide/angular';

@Component({
	selector: 'qfin-user-page',
	imports: [CommonModule, LucideDynamicIcon, UserListComponent, UserView, UserDetail],
	templateUrl: './user.html'
})
export class UserPage {
	public readonly EMPTY_UUID = EMPTY_UUID;

	userStore = inject(UserStore);

	isViewMode = signal<boolean>(true);
	showFilterArea = signal<boolean>(false);
	selectedUserId = signal<string>(EMPTY_UUID);
	searchedUsers = this.userStore.searchedUsers;

	protected readonly userSearchFields = signal<UserSearchParam>({
		searchText: '',
		sortOn: 'userName',
		sortDirection: 'ASC',
		pageIndex: 0,
		pageSize: 10
	});

	protected readonly userSearchForm = form(this.userSearchFields);

	constructor() {
		effect(() => {
			console.log(this.searchedUsers());
		});
	}

	onSort(sort: Sort) {
		this.userStore.setSort(sort.active, sort.direction);
	}

	onPageChange(event: PageEvent) {
		this.userStore.setPagination(event.pageIndex, event.pageSize);
	}

	protected onView(id: string) {
		this.selectedUserId.set(id);
		this.isViewMode.set(true);
	}

	protected onAdd() {
		this.isViewMode.set(false);
		this.selectedUserId.set(EMPTY_UUID);
	}

	protected onEdit() {
		this.isViewMode.set(false);
	}

	protected viewDetail(id: string) {
		this.selectedUserId.set(id);
	}

	protected closePanel() {
		this.selectedUserId.set(EMPTY_UUID);
		this.isViewMode.set(true);
	}

	protected toggleFilterArea() {}
}
