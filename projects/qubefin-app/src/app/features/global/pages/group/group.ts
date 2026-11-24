import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute } from '@angular/router';
import { PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { Sort } from '@angular/material/sort';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideDynamicIcon } from '@lucide/angular';
import { EMPTY_UUID } from 'qubefin-core';
import { GroupDetail } from '../../components/group/group-detail/group-detail';
import { GroupList } from '../../components/group/group-list/group-list';
import { GroupView } from '../../components/group/group-view/group-view';
import { GroupStore } from '../../stores/group-store';

// Group Master (Member menu): the list of groups with view, add and edit.
@Component({
  selector: 'qfin-group',
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    LucideDynamicIcon,
    GroupList,
    GroupView,
    GroupDetail,
  ],
  templateUrl: './group.html',
})
export class GroupPage {
  readonly EMPTY_UUID = EMPTY_UUID;
  readonly groupStore = inject(GroupStore);

  readonly isViewMode = signal<boolean>(true);
  readonly showFilterArea = signal<boolean>(false);
  readonly selectedGroupId = signal<string>(EMPTY_UUID);
  readonly searchText = signal<string>('');
  readonly statusText = signal<string>('');

  readonly hasSelectedGroup = computed(() => this.selectedGroupId() !== EMPTY_UUID || !this.isViewMode());
  readonly statuses = ['Pending', 'Approved', 'Rejected'];

  // Opened from a survey page: "Create Group" (surveyId) opens Add Group with that survey chosen; "Open in Group Master" (groupId) shows the group.
  readonly initialSurveyId = signal<string | null>(null);

  constructor() {
    const params = inject(ActivatedRoute).snapshot.queryParamMap;
    const surveyId = params.get('surveyId');
    const groupId = params.get('groupId');
    if (surveyId) {
      this.initialSurveyId.set(surveyId);
      this.onAdd();
    } else if (groupId) {
      this.onView(groupId);
    }
  }

  protected onView(id: string) {
    this.selectedGroupId.set(id);
    this.isViewMode.set(true);
  }
  protected onEdit() {
    this.isViewMode.set(false);
  }
  protected onAdd() {
    this.isViewMode.set(false);
    this.selectedGroupId.set(EMPTY_UUID);
  }
  protected closePanel() {
    this.selectedGroupId.set(EMPTY_UUID);
    this.isViewMode.set(true);
  }
  // After saving an edit the group is shown again; after adding, the panel closes.
  protected onSaved() {
    if (this.selectedGroupId() === EMPTY_UUID) {
      this.closePanel();
    } else {
      this.isViewMode.set(true);
    }
  }

  protected toggleFilterArea() {
    this.showFilterArea.update((v) => !v);
  }
  protected applyFilters() {
    this.groupStore.setSearchQuery(this.searchText());
    this.groupStore.setStatus(this.statusText());
  }
  protected resetFilters() {
    this.searchText.set('');
    this.statusText.set('');
    this.applyFilters();
  }

  pageChanged(event: PageEvent) {
    this.groupStore.setPage(event.pageIndex);
    this.groupStore.setPageSize(event.pageSize);
  }
  onSortChanged(sort: Sort) {
    if (!sort.direction) return;
    this.groupStore.setSort(sort.active, sort.direction as 'asc' | 'desc');
  }
}
