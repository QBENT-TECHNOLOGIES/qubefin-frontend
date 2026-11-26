import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { EMPTY_UUID } from 'qubefin-core';
import { APP_ICONS_MAP } from '../../../../lucide-icons';
import { MemberDetail } from '../../components/members/member-detail/member-detail';
import { MemberList } from '../../components/members/member-list/member-list';
import { MemberStore } from '../../stores/member-store';
import { MemberView } from '../../components/members/member-view/member-view';

@Component({
  selector: 'qfin-member-component',
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    LucideDynamicIcon,
    MemberDetail,
    MemberList,
    MemberView,
  ],
  templateUrl: './member-component.html',
})
export class MemberComponent {
  public readonly EMPTY_UUID = EMPTY_UUID;
  readonly iconMap = APP_ICONS_MAP;
  readonly memberStore = inject(MemberStore);

  showFilterArea = signal<boolean>(false);
  isViewMode = signal<boolean>(true);
  selectedMemberId = signal<string>(EMPTY_UUID);

  tempSearch = '';
  srchBranchCode = signal<number | null>(null);

  members = this.memberStore.memberListComponents;

  protected onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.memberStore.setSearchQuery(input.value);
  }

  protected toggleFilterArea() {
    this.showFilterArea.update((v) => !v);
  }

  protected applyFilters() {
    this.memberStore.setPage(0);
    this.memberStore.setSearchQuery(this.tempSearch);
    const branch = this.srchBranchCode();
    this.memberStore.setBranchCode(branch && Number(branch) > 0 ? Number(branch) : null);
  }

  protected resetFilters() {
    this.tempSearch = '';
    this.srchBranchCode.set(null);
    this.memberStore.setSearchQuery('');
    this.memberStore.setBranchCode(null);
    this.memberStore.setPage(0);
  }

  pageChanged(event: PageEvent) {
    this.memberStore.setPage(event.pageIndex);
    this.memberStore.setPageSize(event.pageSize);
  }

  onSortChanged(sort: Sort) {
    if (!sort.direction) return;
    this.memberStore.setSort(sort.active, sort.direction as 'asc' | 'desc');
  }

  protected onView(id: string) {
    this.selectedMemberId.set(id);
    this.isViewMode.set(true);
  }

  protected onEdit() {
    this.isViewMode.set(false);
  }

  protected onAdd() {
    this.isViewMode.set(false);
    this.selectedMemberId.set(EMPTY_UUID);
  }

  protected closePanel() {
    this.selectedMemberId.set(EMPTY_UUID);
    this.isViewMode.set(true);
  }

  protected handleCancel() {
    this.selectedMemberId.set(EMPTY_UUID);
    this.isViewMode.set(true);
  }

  protected handleSave(newId?: string) {
    if (newId && typeof newId === 'string' && newId !== EMPTY_UUID && newId.length > 20) {
      this.selectedMemberId.set(newId);
      this.isViewMode.set(false);
    } else {
      this.selectedMemberId.set(EMPTY_UUID);
      this.isViewMode.set(true);
    }
  }
}
