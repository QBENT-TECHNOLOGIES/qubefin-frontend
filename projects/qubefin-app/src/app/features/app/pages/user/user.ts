import { Component, effect, inject, signal } from '@angular/core';
import { EMPTY_UUID } from 'qubefin-core';
import { UserSearchParam } from '../../models/user';
import { UserStore } from '../../stores/user-store';
import { form } from '@angular/forms/signals';
import { Sort } from '@angular/material/sort';
import { PageEvent } from '@angular/material/paginator';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserListComponent } from '../../components/users/user-list/user-list';
import { UserView } from '../../components/users/user-view/user-view';
import { UserDetail } from '../../components/users/user-detail/user-detail';
import { LucideDynamicIcon } from '@lucide/angular';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'qfin-user-page',
  imports: [
    CommonModule,
    FormsModule,
    LucideDynamicIcon,
    UserListComponent,
    UserView,
    UserDetail,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './user.html',
})
export class UserPage {
  public readonly EMPTY_UUID = EMPTY_UUID;

  userStore = inject(UserStore);

  isViewMode = signal<boolean>(true);
  showFilterArea = signal<boolean>(false);
  selectedUserId = signal<string>(EMPTY_UUID);
  searchedUsers = this.userStore.searchedUsers;
  tempSearch = '';
  tempCategory = '';
  readonly categories = signal<Array<{ id: string; name: string }>>([
    { id: '', name: 'All Categories' },
    { id: 'ADMIN', name: 'Admin' },
    { id: 'MANAGER', name: 'Manager' },
    { id: 'USER', name: 'User' },
  ]);

  protected readonly userSearchFields = signal<UserSearchParam>({
    searchText: '',
    sortOn: 'userName',
    sortDirection: 'ASC',
    pageIndex: 0,
    pageSize: 10,
  });

  protected readonly userSearchForm = form(this.userSearchFields);

  constructor() {
    effect(() => {});
  }

  onSort(sort: Sort) {
    const currentPageSize = this.userStore.searchParams().pageSize;
    this.userStore.setPagination(0, currentPageSize);
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

  protected toggleFilterArea() {
    this.showFilterArea.update((value) => !value);
  }

  protected applyFilters() {
    this.userStore.setPagination(0, 10);
    this.userStore.setSearchQuery(this.tempSearch.trim());
    this.userStore.setSort('userName', 'ASC');
  }

  protected resetFilters() {
    this.tempSearch = '';
    this.tempCategory = '';
    this.userStore.setSearchQuery('');
    this.userStore.setPagination(0, 10);
    this.userStore.setSort('userName', 'ASC');
  }
}
