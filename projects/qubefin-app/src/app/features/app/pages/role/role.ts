import { Component, effect, inject, signal } from '@angular/core';
import { RoleListComponent } from '../../components/roles/role-list/role-list';
import { EMPTY_UUID } from 'qubefin-core';
import { RoleStore } from '../../stores/role-store';
import { CommonModule } from '@angular/common';
import { LucideDynamicIcon } from '@lucide/angular';
import { RoleSearchParam } from '../../models/role';
import { form } from '@angular/forms/signals';
import { Sort } from '@angular/material/sort';
import { PageEvent } from '@angular/material/paginator';
import { RoleViewyComponent } from '../../components/roles/role-view/role-view';

@Component({
  selector: 'qfin-role-page',
  imports: [CommonModule, RoleListComponent, RoleViewyComponent, LucideDynamicIcon],
  templateUrl: './role.html',
})
export class RolePage {
  public readonly EMPTY_UUID = EMPTY_UUID;

  roleStore = inject(RoleStore);

  isViewMode = signal<boolean>(true);
  showFilterArea = signal<boolean>(false);
  selectedRoleId = signal<string>(EMPTY_UUID);
  searchedRoles = this.roleStore.searchedRoles;

  protected readonly roleSearchFields = signal<RoleSearchParam>({
    searchText: '',
    sortOn: '',
    sortDirection: 'ASC',
    pageIndex: 0,
    pageSize: 10,
  });

  protected readonly roleSearchForm = form(this.roleSearchFields);

  constructor() {}

  onSort(sort: Sort) {
    this.roleStore.setSort(sort.active, sort.direction);
  }

  onPageChange(event: PageEvent) {
    this.roleStore.setPagination(event.pageIndex, event.pageSize);
  }

  protected onView(id: string) {
    this.selectedRoleId.set(id);
    this.isViewMode.set(true);
  }

  protected onAdd() {
    this.isViewMode.set(false);
    this.selectedRoleId.set(EMPTY_UUID);
  }

  protected onEdit() {
    this.isViewMode.set(false);
  }

  protected viewDetail(id: string) {
    this.selectedRoleId.set(id);
  }
}
